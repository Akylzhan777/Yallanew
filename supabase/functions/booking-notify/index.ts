import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_OPERATOR_TEMPLATE = `🎥 Привет, {{operator_name}}!

Тебе назначена новая съёмка:
📅 Дата: {{shoot_date}}
⏰ Время: {{shoot_time}}
👤 Клиент: {{client_name}}
📱 Телефон: {{client_phone}}
📍 Локация: {{shoot_location}}
💼 Услуга: {{service_type}}
🗺 Точка сбора: {{pickup_location}}

Проверь расписание и будь готов!`;

function applyOperatorTemplate(
  template: string,
  vars: {
    operator_name: string;
    client_name: string;
    client_phone: string;
    shoot_date: string;
    shoot_time: string;
    shoot_location: string;
    service_type: string;
    pickup_location: string;
  },
): string {
  return template
    .split("{{operator_name}}").join(vars.operator_name)
    .split("{{client_name}}").join(vars.client_name)
    .split("{{client_phone}}").join(vars.client_phone)
    .split("{{shoot_date}}").join(vars.shoot_date)
    .split("{{shoot_time}}").join(vars.shoot_time)
    .split("{{shoot_location}}").join(vars.shoot_location)
    .split("{{service_type}}").join(vars.service_type)
    .split("{{pickup_location}}").join(vars.pickup_location);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      operatorName,
      operatorPhone,
      clientName,
      whatsapp,
      location,
      taskDescription,
      date,
      startTime,
      endTime,
      pickupLocation,
    } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    const GREEN_API_URL = Deno.env.get("GREEN_API_URL");
    const GREEN_API_ID = Deno.env.get("GREEN_API_ID");
    const GREEN_API_TOKEN = Deno.env.get("GREEN_API_TOKEN");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: templateRow } = await supabase
      .from("message_templates")
      .select("value")
      .eq("key", "operator_shoot_template")
      .maybeSingle();

    const template: string = templateRow?.value || DEFAULT_OPERATOR_TEMPLATE;

    const dateFormatted = date
      ? new Date(date + "T00:00:00").toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "—";

    const startStr = startTime ? String(startTime).substring(0, 5) : "—";
    const endStr = endTime ? String(endTime).substring(0, 5) : "—";
    const shootTime = `${startStr} – ${endStr}`;

    const results: Record<string, unknown> = {};

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const text = [
        "📸 *Новое бронирование съёмки*",
        "",
        `👤 *Клиент:* ${clientName}`,
        `📱 *WhatsApp:* ${whatsapp}`,
        `🎬 *Оператор:* ${operatorName}`,
        `📅 *Дата:* ${dateFormatted}`,
        `⏰ *Время:* ${shootTime}`,
        `📍 *Локация:* ${location}`,
        `📝 *Задача:* ${taskDescription}`,
      ].join("\n");

      const telegramResp = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }),
        },
      );
      results.telegram = { ok: telegramResp.ok };
    }

    if (GREEN_API_URL && GREEN_API_ID && GREEN_API_TOKEN && operatorPhone) {
      const rawPhone = String(operatorPhone).replace(/\D/g, "");
      if (rawPhone.length >= 7) {
        const message = applyOperatorTemplate(template, {
          operator_name: operatorName || "Оператор",
          client_name: clientName || "—",
          client_phone: whatsapp ? `+${String(whatsapp).replace(/\D/g, "")}` : "—",
          shoot_date: dateFormatted,
          shoot_time: shootTime,
          shoot_location: location || "—",
          service_type: taskDescription || "—",
          pickup_location: pickupLocation || "—",
        });

        const chatId = `${rawPhone}@c.us`;
        const waResp = await fetch(
          `${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId, message }),
          },
        );
        const waData = await waResp.json().catch(() => ({}));
        results.whatsapp = { ok: waResp.ok, idMessage: (waData as { idMessage?: string }).idMessage };
      }
    }

    return new Response(
      JSON.stringify({ ok: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
