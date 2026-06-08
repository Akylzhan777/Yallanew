import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WelcomeRequest {
  phone: string;
  name: string;
  language: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const log: Record<string, unknown> = {};

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed", log }, 405);

    const { phone, name, language }: WelcomeRequest = await req.json();
    log.phone_received = phone;
    log.name = name;
    log.language = language;

    // Strip everything except digits — handles +, spaces, dashes, parentheses
    const cleanNumber = phone.replace(/\D/g, "");
    const chatId = `${cleanNumber}@c.us`;
    log.phone_original = phone;
    log.phone_clean = cleanNumber;
    log.chatId = chatId;
    log.chatId_valid = /^\d{8,15}@c\.us$/.test(chatId);

    if (!log.chatId_valid) {
      console.error("[whatsapp-welcome] INVALID PHONE FORMAT", log);
      return json({ error: "Invalid phone number format", log }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Read Green API credentials from app_settings (admin panel)
    const { data: appSettings } = await admin
      .from("app_settings")
      .select("green_api_base_url, green_api_id_instance, green_api_token_instance")
      .eq("id", 1)
      .maybeSingle();

    const baseUrl = appSettings?.green_api_base_url?.trim()
      || Deno.env.get("GREEN_API_BASE_URL")
      || "https://api.green-api.com";
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
      console.error("[whatsapp-welcome] MISSING CREDENTIALS — configure them in Admin → WhatsApp → Green API tab", log);
      return json({ error: "Green API credentials not configured. Go to Admin → WhatsApp Marketing → Green API tab.", log }, 500);
    }

    // Fetch welcome template
    const { data: tpl, error: tplErr } = await admin
      .from("whatsapp_templates")
      .select("body_en, body_ru, body_ar")
      .eq("key", "welcome")
      .maybeSingle();

    log.template_found = !!tpl;
    log.template_error = tplErr?.message ?? null;

    const fallbackMessage = `Welcome to Yalla Influencers, ${name || "Creator"}! Your profile is now live. 🎉`;

    let message: string;
    if (!tpl) {
      console.warn("[whatsapp-welcome] TEMPLATE NOT FOUND — using fallback", log);
      message = fallbackMessage;
    } else {
      const bodyMap: Record<string, string> = { ru: tpl.body_ru ?? "", ar: tpl.body_ar ?? "", en: tpl.body_en ?? "" };
      const raw = (bodyMap[language] || tpl.body_en || "").replace(/\{\{name\}\}/g, name || "");
      message = raw.trim() || fallbackMessage;
    }

    log.message_length = message.length;
    log.message_preview = message.slice(0, 80);

    const greenUrl = `${baseUrl}/waInstance${idInstance}/sendMessage/${apiToken}`;
    log.green_api_url = `${baseUrl}/waInstance${idInstance}/sendMessage/***TOKEN***`;

    console.log("[whatsapp-welcome] Sending to Green API", log);

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

    console.log("[whatsapp-welcome] Green API response", { status: greenRes.status, body: greenBody });

    if (!greenRes.ok) {
      return json({ error: "Green API returned error", green_status: greenRes.status, green_body: greenBody, log }, 502);
    }

    return json({ ok: true, chatId, green_status: greenRes.status, green_body: greenBody, log });
  } catch (err) {
    log.exception = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp-welcome] EXCEPTION", log);
    return json({ error: log.exception, log }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
