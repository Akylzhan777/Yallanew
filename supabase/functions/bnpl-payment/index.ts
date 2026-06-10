import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Tabby session creation ──────────────────────────────────────────────────

async function createTabbySession(payload: {
  amount: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  orderId: string;
  packageName: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
}) {
  const apiKey = Deno.env.get("TABBY_SECRET_KEY");
  if (!apiKey) throw new Error("TABBY_SECRET_KEY not configured");

  const body = {
    payment: {
      amount: (payload.amount / 100).toFixed(2), // Tabby uses string decimals
      currency: payload.currency,
      description: payload.packageName,
      buyer: {
        name: payload.buyerName,
        email: payload.buyerEmail,
        phone: payload.buyerPhone,
      },
      order: {
        reference_id: payload.orderId,
        items: [
          {
            title: payload.packageName,
            quantity: 1,
            unit_price: (payload.amount / 100).toFixed(2),
            category: "Services",
          },
        ],
      },
      buyer_history: { registered_since: new Date().toISOString(), loyalty_level: 0 },
      order_history: [],
    },
    merchant_code: Deno.env.get("TABBY_MERCHANT_CODE") ?? "default",
    lang: "en",
    merchant_urls: {
      success: payload.successUrl,
      cancel: payload.cancelUrl,
      failure: payload.failureUrl,
    },
  };

  const res = await fetch("https://api.tabby.ai/api/v2/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tabby API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Tamara session creation ─────────────────────────────────────────────────

async function createTamaraSession(payload: {
  amount: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  orderId: string;
  packageName: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
}) {
  const apiKey = Deno.env.get("TAMARA_API_TOKEN");
  if (!apiKey) throw new Error("TAMARA_API_TOKEN not configured");

  const nameParts = payload.buyerName.trim().split(" ");
  const firstName = nameParts[0] ?? payload.buyerName;
  const lastName = nameParts.slice(1).join(" ") || firstName;

  const body = {
    total_amount: { amount: String(payload.amount), currency: payload.currency },
    description: payload.packageName,
    country_code: "AE",
    order_reference_id: payload.orderId,
    consumer: {
      first_name: firstName,
      last_name: lastName,
      email: payload.buyerEmail,
      phone_number: payload.buyerPhone,
    },
    billing_address: {
      first_name: firstName,
      last_name: lastName,
      line1: "Dubai",
      city: "Dubai",
      country_code: "AE",
    },
    items: [
      {
        reference_id: payload.orderId,
        type: "Services",
        name: payload.packageName,
        sku: "marketplace-pkg",
        quantity: 1,
        total_amount: { amount: String(payload.amount), currency: payload.currency },
        discount_amount: { amount: "0", currency: payload.currency },
        tax_amount: { amount: "0", currency: payload.currency },
        unit_price: { amount: String(payload.amount), currency: payload.currency },
      },
    ],
    payment_type: "PAY_BY_INSTALMENTS",
    instalments: 3,
    urls: {
      success: payload.successUrl,
      failure: payload.failureUrl,
      cancel: payload.cancelUrl,
      notification: `${Deno.env.get("SUPABASE_URL")}/functions/v1/bnpl-payment/webhook`,
    },
  };

  const res = await fetch("https://api-sandbox.tamara.co/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tamara API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Webhook handler ─────────────────────────────────────────────────────────

async function handleWebhook(req: Request): Promise<Response> {
  const body = await req.json();

  // Tabby webhook payload shape
  const tabbyStatus = body?.payment?.status;
  const tabbyOrderRef = body?.payment?.order?.reference_id ?? body?.order?.reference_id;

  // Tamara webhook payload shape
  const tamaraStatus = body?.event_type ?? body?.status;
  const tamaraOrderRef = body?.order_reference_id ?? body?.data?.order_reference_id;

  const orderId = tabbyOrderRef ?? tamaraOrderRef;
  const rawStatus = tabbyStatus ?? tamaraStatus ?? "";

  if (!orderId) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const isApproved =
    rawStatus === "AUTHORIZED" || // Tabby
    rawStatus === "approved" || // Tabby alt
    rawStatus === "order_approved" || // Tamara
    rawStatus === "ORDER_APPROVED"; // Tamara alt

  const isDeclined =
    rawStatus === "CLOSED" ||
    rawStatus === "rejected" ||
    rawStatus === "order_declined";

  if (isApproved) {
    // Move order to on_hold (escrow) — platform has full amount from BNPL provider
    const { data: order } = await supabase
      .from("marketplace_orders")
      .update({
        status: "on_hold",
        payment_provider_status: rawStatus,
      })
      .eq("id", orderId)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (order) {
      // Model B: package_price = clientPrice. creator_net_amount = creator's base price.
      // Fallback: package_price / 1.2.
      const netAmount = Math.round(
        (order.creator_net_amount && order.creator_net_amount > 0)
          ? order.creator_net_amount
          : order.package_price / 1.2
      );
      const commission = order.package_price - netAmount;

      await supabase.from("creator_transactions").insert({
        creator_id: order.creator_id,
        order_id: order.id,
        type: "order_payment",
        status: "on_hold",
        amount: order.package_price,
        net_amount: netAmount,
        platform_fee: commission,
        description: `BNPL order from ${order.buyer_name} — ${order.package_name} (on hold)`,
      });

      // Update creator on_hold balance
      const { data: cp } = await supabase
        .from("creator_profiles")
        .select("balance_on_hold")
        .eq("id", order.creator_id)
        .maybeSingle();

      if (cp) {
        const current = (cp as { balance_on_hold?: number }).balance_on_hold ?? 0;
        await supabase
          .from("creator_profiles")
          .update({ balance_on_hold: current + netAmount })
          .eq("id", order.creator_id);
      }

      // Notify creator via telegram if configured
      const { data: settings } = await supabase
        .from("telegram_settings")
        .select("bot_token, chat_id")
        .maybeSingle();

      if (settings?.bot_token && settings?.chat_id) {
        const msg = `🛒 New BNPL order!\nCreator: ${order.creator_id}\nPackage: ${order.package_name}\nAmount: ${order.package_price} AED\nOrder: #${order.id.slice(0, 8).toUpperCase()}`;
        await fetch(
          `https://api.telegram.org/bot${settings.bot_token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: settings.chat_id, text: msg }),
          },
        ).catch(() => {});
      }
    }
  } else if (isDeclined) {
    await supabase
      .from("marketplace_orders")
      .update({ status: "cancelled", payment_provider_status: rawStatus })
      .eq("id", orderId)
      .eq("status", "pending");
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);

  try {
    // Webhook endpoint — no JWT required, called by Tabby/Tamara
    if (url.pathname.endsWith("/webhook")) {
      return await handleWebhook(req);
    }

    // Session creation — called from frontend
    const body = await req.json();
    const { provider, amount, currency = "AED", buyer_name, buyer_email, buyer_phone = "", order_id, package_name, success_url, cancel_url, failure_url } = body;

    if (!provider || !amount || !buyer_name || !buyer_email || !order_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: provider, amount, buyer_name, buyer_email, order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = Deno.env.get("SITE_URL") ?? "https://mythfilms.ae";
    const successUrl = success_url ?? `${baseUrl}/?order=${order_id}&payment=success`;
    const cancelUrl = cancel_url ?? `${baseUrl}/?order=${order_id}&payment=cancel`;
    const failureUrl = failure_url ?? `${baseUrl}/?order=${order_id}&payment=failure`;

    let sessionData: Record<string, unknown>;

    if (provider === "tabby") {
      sessionData = await createTabbySession({
        amount, currency, buyerName: buyer_name, buyerEmail: buyer_email,
        buyerPhone: buyer_phone, orderId: order_id, packageName: package_name ?? "Creator Package",
        successUrl, cancelUrl, failureUrl,
      });
    } else if (provider === "tamara") {
      sessionData = await createTamaraSession({
        amount, currency, buyerName: buyer_name, buyerEmail: buyer_email,
        buyerPhone: buyer_phone, orderId: order_id, packageName: package_name ?? "Creator Package",
        successUrl, cancelUrl, failureUrl,
      });
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown provider: ${provider}. Use 'tabby' or 'tamara'.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract checkout URL
    const checkoutUrl =
      (sessionData as { configuration?: { available_products?: { installments?: Array<{ web_url?: string }> } } })?.configuration?.available_products?.installments?.[0]?.web_url ?? // Tabby
      (sessionData as { checkout_url?: string })?.checkout_url ?? // Tamara
      null;

    const sessionId =
      (sessionData as { id?: string })?.id ??
      (sessionData as { checkout_id?: string })?.checkout_id ??
      null;

    return new Response(
      JSON.stringify({ checkout_url: checkoutUrl, session_id: sessionId, raw: sessionData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
