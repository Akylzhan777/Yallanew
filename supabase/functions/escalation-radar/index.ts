import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Юзернеймы "наших" (команда монтажеров). Любое совпадение в sender_name
// исключает сообщение из эскалации.
const TEAM_USERNAMES = ["vlad", "влад", "sanya", "саня", "maga", "мага", "farid", "фарид"];

// Теги, которые будут упомянуты в алерте
const TEAM_MENTIONS = "@vlad @sanya @maga @farid";

const THRESHOLD_MINUTES = 10;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings, error: settingsErr } = await supabase
      .from("telegram_settings")
      .select("bot_token")
      .limit(1)
      .maybeSingle();

    if (settingsErr) throw new Error("Failed to load telegram_settings: " + settingsErr.message);
    const botToken = settings?.bot_token?.trim();
    if (!botToken) throw new Error("Telegram bot_token not configured");

    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const thresholdCutoff = new Date(Date.now() - THRESHOLD_MINUTES * 60 * 1000).toISOString();

    const { data: rows, error: rowsErr } = await supabase
      .from("chat_history_log")
      .select("id, chat_id, sender_name, message_text, created_at, escalation_sent")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false });

    if (rowsErr) throw new Error("Failed to load chat history: " + rowsErr.message);

    const latestByChat = new Map<string, typeof rows[number]>();
    for (const row of rows ?? []) {
      if (!latestByChat.has(row.chat_id)) {
        latestByChat.set(row.chat_id, row);
      }
    }

    const alerts: Array<{ chat_id: string; message_id: string }> = [];

    for (const [chatId, latest] of latestByChat) {
      if (latest.escalation_sent) continue;
      if (latest.created_at > thresholdCutoff) continue;

      const senderLower = (latest.sender_name ?? "").toLowerCase();
      const isTeam = TEAM_USERNAMES.some((u) => senderLower.includes(u));
      if (isTeam) continue;

      const alertText = `⚠️ ${TEAM_MENTIONS}, клиент ожидает ответа уже более ${THRESHOLD_MINUTES} минут. Пожалуйста, возьмите в работу!`;

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: alertText }),
      });
      const tgJson = await tgRes.json();

      if (tgRes.ok && tgJson.ok) {
        await supabase
          .from("chat_history_log")
          .update({ escalation_sent: true })
          .eq("id", latest.id);
        alerts.push({ chat_id: chatId, message_id: latest.id });
      } else {
        console.log("Telegram send error:", JSON.stringify(tgJson));
      }
    }

    return new Response(
      JSON.stringify({ ok: true, chats_checked: latestByChat.size, alerts_sent: alerts.length, alerts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
