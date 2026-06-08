import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Initialised once at cold-start — reused across all warm invocations.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
const serviceClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// In-memory rate limiter: max 5 requests per 60s per identity
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(identity: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identity);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identity, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function unauthorized(msg = "Unauthorized") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── 1. Require Authorization header ─────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return unauthorized();
  const token = authHeader.slice(7);

  // ── 2. Verify JWT — resolve caller identity ──────────────────────────
  // verify_jwt:true already validated the signature at the gateway.
  // auth.getUser() additionally checks if this is a live user session
  // vs. an anon-key JWT. Both are allowed; the result determines
  // whether we can pin a booked_by_user_id.
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  // user === null for anonymous (anon-key JWT) visitors — allowed.
  // An explicit auth error on a non-anon token means the session is expired/invalid.
  if (authError && user === null && token.split(".").length !== 3) {
    return unauthorized("Invalid token");
  }

  // ── 3. Rate limiting by verified identity ───────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";
  const identity = user?.id ?? ip;

  if (!checkRateLimit(identity)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { creator_id, client_name, client_phone, booking_date, booking_time, details, package_id } = body;

    if (!creator_id || !client_name || !booking_date || !booking_time) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Lazy cleanup: cancel stale pending bookings for this creator ──────
    // Runs before any slot check so expired holds don't block new clients.
    // Fire-and-forget — a failure here must not block the booking flow.
    const expiryCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    serviceClient
      .from("creator_bookings")
      .update({ status: "cancelled" })
      .eq("creator_id", creator_id)
      .eq("status", "pending")
      .lt("created_at", expiryCutoff)
      .then(() => { /* audit trail preserved via status change */ });

    // ── Server-side pricing ──────────────────────────────────────────────
    // Fetch creator profile once; used for both package lookup and WhatsApp number.
    const { data: creatorProfile } = await serviceClient
      .from("creator_profiles")
      .select("whatsapp_number, display_name, packages")
      .eq("id", creator_id)
      .maybeSingle();

    type PkgRow = { id: string; name: string; price: number; clientPrice?: number };
    const profilePackages: PkgRow[] = Array.isArray(creatorProfile?.packages)
      ? (creatorProfile.packages as PkgRow[])
      : [];

    let resolvedPackageName: string | null = null;
    let packagePrice: number | null = null;
    let creatorPayoutAmount: number | null = null;

    if (package_id) {
      const pkg = profilePackages.find((p) => p.id === package_id);
      if (pkg) {
        // actualPrice = what client pays; never trust the client-sent price
        const actualPrice = pkg.clientPrice ?? Math.round(pkg.price * 1.2);
        resolvedPackageName = pkg.name;
        packagePrice = actualPrice;
        creatorPayoutAmount = Math.round(actualPrice * 0.8);
      }
    }

    // Compute end_time (+60 min), capped at WORK_END (18:00) and safe against midnight rollover
    const WORK_END_MIN = 18 * 60;
    const [hh, mm] = booking_time.split(":").map(Number);
    const rawEndMin = hh * 60 + mm + 60;
    const endTotalMin = Math.min(rawEndMin, WORK_END_MIN);
    const endHour = Math.floor(endTotalMin / 60) % 24;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endTotalMin % 60).padStart(2, "0")}`;

    // ── 4. Atomic order creation (marketplace_orders → creator_bookings) ──
    // Create the parent order first so escrow + chat triggers have a single
    // source of truth to fire on. The booking row is then linked via order_id.
    const { data: order, error: orderErr } = await serviceClient
      .from("marketplace_orders")
      .insert({
        creator_id,
        client_user_id: user?.id ?? null,
        buyer_name: client_name,
        package_id: package_id ?? null,
        package_name: resolvedPackageName ?? null,
        package_price: packagePrice ?? null,
        creator_payout_amount: creatorPayoutAmount ?? null,
        status: "pending",
        order_type: "booking",
        region: "KZ",
      })
      .select("id")
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: orderErr?.message ?? "Order creation failed", error_type: "generic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 5. Single authoritative booking insert ──────────────────────────
    // booked_by_user_id is set ONLY from the server-side JWT — client body cannot influence it.
    // package_price and creator_payout_amount are set from server-side lookup above.
    const { data: booking, error: bookingErr } = await serviceClient
      .from("creator_bookings")
      .insert({
        creator_id,
        client_name,
        client_phone: client_phone ?? "",
        client_email: "",
        booking_date,
        booking_time,
        start_time: booking_time,
        end_time: endTime,
        details: details ?? "",
        status: "pending_payment",
        order_id: order.id,
        ...(user ? { booked_by_user_id: user.id } : {}),
        ...(resolvedPackageName ? { package_id, package_name: resolvedPackageName } : {}),
        ...(packagePrice !== null ? { package_price: packagePrice } : {}),
        ...(creatorPayoutAmount !== null ? { creator_payout_amount: creatorPayoutAmount } : {}),
      })
      .select()
      .maybeSingle();

    if (bookingErr || !booking) {
      // Roll back the orphaned order so it doesn't pollute the orders table
      await serviceClient.from("marketplace_orders").delete().eq("id", order.id);
      const isConflict = bookingErr?.code === '23P01';
      return new Response(
        JSON.stringify({
          error: isConflict ? "slot_conflict" : (bookingErr?.message ?? "Insert failed"),
          error_type: isConflict ? "slot_conflict" : "generic",
        }),
        {
          status: isConflict ? 409 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 5. WhatsApp notification to creator ─────────────────────────────
    const whatsappNumber = creatorProfile?.whatsapp_number as string | null | undefined;

    try {
      if (whatsappNumber) {
        const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
        const apiToken = Deno.env.get("GREEN_API_TOKEN");

        if (instanceId && apiToken) {
          const dateFormatted = new Date(booking_date).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          const message =
            `🚀 Новая бронь на Yalla Influencers!\n` +
            `Дата: ${dateFormatted}\n` +
            `Время: ${booking_time}\n` +
            `Заказчик: ${client_name}` +
            (client_phone ? `\nТелефон: ${client_phone}` : "") +
            (resolvedPackageName ? `\nУслуга: ${resolvedPackageName}` : "") +
            (creatorPayoutAmount !== null
              ? `\n💰 Ваш заработок: ${creatorPayoutAmount.toLocaleString("ru-RU")} ₸`
              : "") +
            (details ? `\nПожелания: ${details.length > 500 ? details.substring(0, 500) + '... (текст обрезан)' : details}` : "") +
            `\n\nЗайдите в личный кабинет для деталей.`;

          let phone = whatsappNumber.replace(/\D/g, "");
          if (phone.length === 11 && phone.startsWith("8")) {
            phone = "7" + phone.slice(1);
          } else if (phone.length === 10) {
            phone = "7" + phone;
          }

          const greenApiRes = await fetch(
            `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
            },
          );

          if (!greenApiRes.ok) {
            const errorData = await greenApiRes.text();

            // Log failure to DB
            await serviceClient.from("notification_logs").insert({
              event_type: "whatsapp_delivery_failed",
              status_code: greenApiRes.status,
              error_details: errorData,
              booking_id: booking.id,
            });

            // Send Telegram alert for auth/balance failures
            if (greenApiRes.status === 401 || greenApiRes.status === 403) {
              await fetch(
                `https://api.telegram.org/bot8708200263:AAHyTaI-HM5ICH805r3usAKQNlQozbpqud4/sendMessage`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: "-1003854532235",
                    text: `🚨 КРИТИЧЕСКАЯ ОШИБКА: Green API недоступен или токен истек! Уведомления не уходят.\n\nHTTP ${greenApiRes.status}\n${errorData}`,
                  }),
                },
              );
            }
          }
        }
      }
    } catch (_whatsappErr) {
      // WhatsApp delivery failure must never break the booking flow
    }

    return new Response(JSON.stringify({ ok: true, booking_id: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
