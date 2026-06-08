import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Supported event types ────────────────────────────────────────────────────
type EventType = "new_creator" | "new_order";

interface NewCreatorPayload {
  event: "new_creator";
  creator_id: string;
  display_name: string;
  username: string | null;
  category: string;
  created_at: string;
}

interface NewOrderPayload {
  event: "new_order";
  order_id: string;
  buyer_name: string;
  buyer_email: string;
  package_name: string;
  package_price: number;
  creator_display_name: string;
  status: string;
  created_at: string;
}

type WebhookPayload = NewCreatorPayload | NewOrderPayload;

// ── Helper: send to webhook URL if configured ────────────────────────────────
async function sendWebhook(webhookUrl: string | undefined, payload: WebhookPayload): Promise<void> {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // non-blocking — webhook delivery is best-effort
  }
}

// ── Helper: send Telegram message if configured ──────────────────────────────
async function sendTelegram(botToken: string | undefined, chatId: string | undefined, text: string): Promise<void> {
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // non-blocking
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Read notification config from app_settings (webhook_url, telegram_bot_token, telegram_chat_id)
    const { data: settings } = await supabase
      .from("app_settings")
      .select("marketplace_webhook_url, telegram_bot_token, telegram_admin_chat_id")
      .maybeSingle();

    const webhookUrl: string | undefined = settings?.marketplace_webhook_url;
    const botToken: string | undefined = settings?.telegram_bot_token;
    const chatId: string | undefined = settings?.telegram_admin_chat_id;

    const eventType = req.headers.get("X-Event-Type") as EventType | null;
    if (!eventType) {
      return new Response(JSON.stringify({ error: "Missing X-Event-Type header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    if (eventType === "new_creator") {
      const payload: NewCreatorPayload = {
        event: "new_creator",
        creator_id: body.creator_id,
        display_name: body.display_name,
        username: body.username ?? null,
        category: body.category ?? "",
        created_at: new Date().toISOString(),
      };

      const tgText = `🆕 <b>New Creator Registered</b>\n\n👤 <b>${payload.display_name}</b>${payload.username ? `\n🔗 /${payload.username}` : ""}\n📂 Category: ${payload.category}\n🕐 ${new Date(payload.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}`;

      await Promise.all([
        sendWebhook(webhookUrl, payload),
        sendTelegram(botToken, chatId, tgText),
      ]);

      return new Response(JSON.stringify({ ok: true, event: "new_creator" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (eventType === "new_order") {
      const payload: NewOrderPayload = {
        event: "new_order",
        order_id: body.order_id,
        buyer_name: body.buyer_name ?? "",
        buyer_email: body.buyer_email ?? "",
        package_name: body.package_name ?? "",
        package_price: body.package_price ?? 0,
        creator_display_name: body.creator_display_name ?? "",
        status: body.status ?? "on_hold",
        created_at: new Date().toISOString(),
      };

      const tgText = `💰 <b>New Order — AED ${payload.package_price}</b>\n\n🛍 <b>${payload.package_name}</b>\n👤 Buyer: ${payload.buyer_name || payload.buyer_email}\n🎬 Creator: ${payload.creator_display_name}\n📌 Status: ${payload.status}\n🕐 ${new Date(payload.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}`;

      await Promise.all([
        sendWebhook(webhookUrl, payload),
        sendTelegram(botToken, chatId, tgText),
      ]);

      return new Response(JSON.stringify({ ok: true, event: "new_order" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown event type: ${eventType}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
