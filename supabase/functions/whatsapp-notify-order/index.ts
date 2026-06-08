import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotifyRequest {
  order_id: string;
}

const TEMPLATES: Record<string, string> = {
  ru: '🚀 Поздравляем, {{name}}! На платформе Yalla Influencers только что оплатили вашу услугу: "{{service}}". Сумма: {{amount}} AED. Пожалуйста, срочно зайдите в свой личный кабинет на платформе, чтобы посмотреть техническое задание (ТЗ) от клиента и начать работу.',
  ar: '🚀 تهانينا، {{name}}! تم للتو شراء خدمتك على منصة Yalla Influencers: "{{service}}". المبلغ: {{amount}} درهم إماراتي. يرجى تسجيل الدخول إلى لوحة التحكم على الفور لمراجعة الموجز الفني والبدء في العمل.',
  en: '🚀 Congratulations, {{name}}! Someone just purchased your service on Yalla Influencers: "{{service}}". Amount: {{amount}} AED. Please log in to your dashboard immediately to review the technical brief and start working.',
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const log: Record<string, unknown> = {};

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed", log }, 405);

    const { order_id }: NotifyRequest = await req.json();
    log.order_id = order_id;
    if (!order_id) return json({ error: "order_id required", log }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: order, error: orderErr } = await admin
      .from("marketplace_orders")
      .select(`
        id, status, package_name, package_price, creator_id,
        creator_profiles ( display_name, whatsapp_number, preferred_language )
      `)
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      log.lookup_error = orderErr?.message ?? "not found";
      console.error("[whatsapp-notify-order] Order lookup failed", log);
      return json({ error: "Order not found", log }, 404);
    }

    const creator = (order as { creator_profiles: { display_name: string | null; whatsapp_number: string | null; preferred_language: string | null } | null }).creator_profiles;
    log.creator_name = creator?.display_name;
    log.creator_lang = creator?.preferred_language;
    log.has_whatsapp = !!creator?.whatsapp_number;

    if (!creator?.whatsapp_number) {
      console.warn("[whatsapp-notify-order] Creator has no WhatsApp number — skipped", log);
      return json({ ok: false, skipped: true, reason: "no_whatsapp", log });
    }

    const cleanNumber = String(creator.whatsapp_number).replace(/\D/g, "");
    const chatId = `${cleanNumber}@c.us`;
    log.chatId = chatId;
    log.chatId_valid = /^\d{8,15}@c\.us$/.test(chatId);

    if (!log.chatId_valid) {
      console.error("[whatsapp-notify-order] Invalid creator phone format", log);
      return json({ error: "Invalid creator phone format", log }, 400);
    }

    const { data: appSettings } = await admin
      .from("app_settings")
      .select("green_api_base_url, green_api_id_instance, green_api_token_instance")
      .eq("id", 1)
      .maybeSingle();

    const baseUrl = (appSettings?.green_api_base_url?.trim()
      || Deno.env.get("GREEN_API_BASE_URL")
      || "https://api.green-api.com").replace(/\/+$/, "");
    const idInstance = appSettings?.green_api_id_instance?.trim()
      || Deno.env.get("GREEN_API_ID_INSTANCE")
      || "";
    const apiToken = appSettings?.green_api_token_instance?.trim()
      || Deno.env.get("GREEN_API_API_TOKEN_INSTANCE")
      || "";

    log.base_url = baseUrl;
    log.id_instance_set = !!idInstance;
    log.api_token_set = !!apiToken;

    if (!idInstance || !apiToken) {
      console.error("[whatsapp-notify-order] Missing Green API credentials", log);
      return json({ error: "Green API credentials not configured", log }, 500);
    }

    const langRaw = (creator.preferred_language ?? "en").toLowerCase().slice(0, 2);
    const langKey = langRaw === "ru" || langRaw === "ar" ? langRaw : "en";
    log.lang_used = langKey;

    const message = TEMPLATES[langKey]
      .replace(/\{\{name\}\}/g, creator.display_name || "Creator")
      .replace(/\{\{service\}\}/g, order.package_name || "Service")
      .replace(/\{\{amount\}\}/g, String(order.package_price ?? 0));
    log.message_preview = message.slice(0, 120);

    const greenUrl = `${baseUrl}/waInstance${idInstance}/sendMessage/${apiToken}`;
    log.green_api_url = `${baseUrl}/waInstance${idInstance}/sendMessage/***TOKEN***`;

    console.log("[whatsapp-notify-order] Sending to Green API", log);

    const greenRes = await fetch(greenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });

    let greenBody: unknown;
    try { greenBody = await greenRes.json(); }
    catch { greenBody = await greenRes.text().catch(() => "(empty)"); }

    log.green_api_status = greenRes.status;
    log.green_api_response = greenBody;

    console.log("[whatsapp-notify-order] Green API response", { status: greenRes.status, body: greenBody });

    if (!greenRes.ok) {
      return json({ error: "Green API returned error", green_status: greenRes.status, green_body: greenBody, log }, 502);
    }

    return json({ ok: true, chatId, green_status: greenRes.status, green_body: greenBody, log });
  } catch (err) {
    log.exception = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp-notify-order] EXCEPTION", log);
    return json({ error: log.exception, log }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
