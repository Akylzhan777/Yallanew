import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const log: Record<string, unknown> = {};

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { chat_id, sender_id, message_text } = await req.json();
    log.chat_id = chat_id;
    log.sender_id = sender_id;

    if (!chat_id || !sender_id) return json({ error: "chat_id and sender_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Load chat + linked order region in one query
    const { data: chat, error: chatErr } = await admin
      .from("deal_chats")
      .select(`
        id, client_id, freelancer_id, order_id,
        last_notified_client_at, last_notified_creator_at,
        marketplace_orders ( region )
      `)
      .eq("id", chat_id)
      .maybeSingle();

    if (chatErr || !chat) {
      log.chat_error = chatErr?.message ?? "not found";
      return json({ skipped: true, reason: "chat_not_found", log });
    }

    const order = (chat as { marketplace_orders: { region: string | null } | null }).marketplace_orders;
    const region = order?.region ?? "";
    log.region = region;

    // KZ-only — skip all other regions entirely
    if (region !== "KZ") {
      return json({ skipped: true, reason: "non_kz_region" });
    }

    // Determine recipient (the other participant)
    const recipientIsClient = sender_id === chat.freelancer_id;
    const recipientIsCreator = sender_id === chat.client_id;

    if (!recipientIsClient && !recipientIsCreator) {
      return json({ skipped: true, reason: "sender_not_participant" });
    }

    // Throttle check — only notify once per 10 minutes per side
    const throttleKey = recipientIsClient
      ? "last_notified_client_at"
      : "last_notified_creator_at";

    const lastNotified = chat[throttleKey as keyof typeof chat] as string | null;
    if (lastNotified) {
      const elapsed = Date.now() - new Date(lastNotified).getTime();
      if (elapsed < THROTTLE_MS) {
        log.throttled_since = lastNotified;
        return json({ skipped: true, reason: "throttled", elapsed_ms: elapsed });
      }
    }

    // Load Green API credentials from app_settings
    const { data: settings } = await admin
      .from("app_settings")
      .select("green_api_base_url, green_api_id_instance, green_api_token_instance")
      .eq("id", 1)
      .maybeSingle();

    const baseUrl = (settings?.green_api_base_url?.trim() ||
      Deno.env.get("GREEN_API_BASE_URL") ||
      "https://api.green-api.com").replace(/\/+$/, "");
    const idInstance = settings?.green_api_id_instance?.trim() || Deno.env.get("GREEN_API_ID_INSTANCE") || "";
    const apiToken = settings?.green_api_token_instance?.trim() || Deno.env.get("GREEN_API_API_TOKEN_INSTANCE") || "";

    if (!idInstance || !apiToken) {
      return json({ skipped: true, reason: "green_api_not_configured" });
    }

    let recipientPhone: string | null = null;
    let recipientName = "пользователь";
    let senderName = "";
    let message = "";

    if (recipientIsClient) {
      // Sender = creator, recipient = client
      const [{ data: clientProfile }, { data: creatorProfile }] = await Promise.all([
        admin.from("client_profiles").select("display_name, phone").eq("user_id", chat.client_id).maybeSingle(),
        admin.from("creator_profiles").select("display_name").eq("user_id", chat.freelancer_id).maybeSingle(),
      ]);
      recipientPhone = (clientProfile as { phone?: string | null } | null)?.phone ?? null;
      recipientName = (clientProfile as { display_name?: string | null } | null)?.display_name ?? "Клиент";
      senderName = (creatorProfile as { display_name?: string | null } | null)?.display_name ?? "Видеограф";
      message =
        `🔔 Видеограф ${senderName} ответил вам!\n` +
        `Прочитайте сообщение в личном кабинете:\n` +
        `https://yallainfluencers.com/brand/dashboard?tab=messages&chat=${chat_id}`;
    } else {
      // Sender = client, recipient = creator
      const [{ data: creatorProfile }, { data: clientProfile }] = await Promise.all([
        admin.from("creator_profiles").select("display_name, whatsapp_number").eq("user_id", chat.freelancer_id).maybeSingle(),
        admin.from("client_profiles").select("display_name").eq("user_id", chat.client_id).maybeSingle(),
      ]);
      recipientPhone = (creatorProfile as { whatsapp_number?: string | null } | null)?.whatsapp_number ?? null;
      recipientName = (creatorProfile as { display_name?: string | null } | null)?.display_name ?? "Видеограф";
      senderName = (clientProfile as { display_name?: string | null } | null)?.display_name ?? "Клиент";
      message =
        `🔔 У вас новое сообщение от заказчика ${senderName}!\n` +
        `Пожалуйста, проверьте чат и ответьте:\n` +
        `https://yallainfluencers.com/creator/dashboard?tab=messages&chat=${chat_id}`;
    }

    log.recipient_role = recipientIsClient ? "client" : "creator";
    log.has_phone = !!recipientPhone;

    if (!recipientPhone) {
      return json({ skipped: true, reason: "no_phone", recipient: log.recipient_role });
    }

    const cleanPhone = String(recipientPhone).replace(/\D/g, "");
    const chatId = `${cleanPhone}@c.us`;

    if (!/^\d{8,15}@c\.us$/.test(chatId)) {
      return json({ skipped: true, reason: "invalid_phone_format", phone: cleanPhone });
    }

    log.chatId = chatId;
    log.message_preview = message.slice(0, 80);

    const greenUrl = `${baseUrl}/waInstance${idInstance}/sendMessage/${apiToken}`;
    const greenRes = await fetch(greenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });

    let greenBody: unknown;
    try { greenBody = await greenRes.json(); }
    catch { greenBody = await greenRes.text().catch(() => "(empty)"); }

    log.green_status = greenRes.status;
    log.green_body = greenBody;

    if (!greenRes.ok) {
      console.error("[chat-notify] Green API error", log);
      return json({ error: "Green API error", log }, 502);
    }

    // Update throttle timestamp
    await admin
      .from("deal_chats")
      .update({ [throttleKey]: new Date().toISOString() })
      .eq("id", chat_id);

    console.log("[chat-notify] Notification sent", log);
    return json({ ok: true, recipient: log.recipient_role, chatId, log });

  } catch (err) {
    log.exception = err instanceof Error ? err.message : String(err);
    console.error("[chat-notify] EXCEPTION", log);
    return json({ error: log.exception, log }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
