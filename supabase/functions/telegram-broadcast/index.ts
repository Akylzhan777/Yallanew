import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function handleBroadcast(supabase: ReturnType<typeof createClient>, broadcastType: string) {
  const messageIdCol = broadcastType === "daily" ? "last_daily_message_id" : "last_weekly_message_id";

  const { data: settingsRow, error: settingsError } = await supabase
    .from("telegram_settings")
    .select("bot_token, message_template, daily_template")
    .eq("id", "11111111-1111-1111-1111-111111111111")
    .maybeSingle();

  if (settingsError) throw new Error("Failed to load settings: " + settingsError.message);
  if (!settingsRow?.bot_token) throw new Error("Bot token not configured");

  const { bot_token, message_template, daily_template } = settingsRow;
  const template = broadcastType === "daily" ? daily_template : message_template;

  if (!template?.trim()) throw new Error(`${broadcastType} template not configured`);

  const { data: groups, error: groupsError } = await supabase
    .from("telegram_groups")
    .select("id, name, chat_id, last_weekly_message_id, last_daily_message_id")
    .order("created_at");

  if (groupsError) throw new Error("Failed to load groups: " + groupsError.message);
  if (!groups?.length) throw new Error("No groups configured");

  const results: Array<{
    name: string;
    chat_id: string;
    ok: boolean;
    deleted?: boolean;
    new_message_id?: string;
    error?: string;
  }> = [];

  for (const group of groups) {
    const prevMessageId: string | null = (group as Record<string, unknown>)[messageIdCol] as string | null ?? null;
    let deleted = false;

    if (prevMessageId) {
      try {
        await fetch(`https://api.telegram.org/bot${bot_token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: group.chat_id, message_id: Number(prevMessageId) }),
        });
        deleted = true;
      } catch (_) {}
    }

    try {
      const sendRes = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: group.chat_id, text: template, parse_mode: "HTML" }),
      });
      const sendJson = await sendRes.json();

      if (sendJson.ok) {
        const newMessageId = String(sendJson.result.message_id);
        await supabase.from("telegram_groups").update({ [messageIdCol]: newMessageId }).eq("id", group.id);
        results.push({ name: group.name, chat_id: group.chat_id, ok: true, deleted, new_message_id: newMessageId });
      } else {
        results.push({ name: group.name, chat_id: group.chat_id, ok: false, deleted, error: sendJson.description });
      }
    } catch (e) {
      results.push({ name: group.name, chat_id: group.chat_id, ok: false, deleted, error: String(e) });
    }
  }

  return { type: broadcastType, sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results };
}

async function handleAnalyze(supabase: ReturnType<typeof createClient>, videoUrl: string, requestedBy: string) {
  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

  const prompt = `You are a viral content strategist. Analyze the YouTube/Reels video at this URL: ${videoUrl}

Please provide a structured analysis with the following sections:

1. TRANSCRIPTION: Provide the full text transcription of the video content (or describe what is likely being said/shown based on the URL context if direct transcription is not possible).

2. KEY TAKEAWAYS: List the top 3 most important ideas or lessons from this video.

3. VIRAL HOOK: Explain specifically why this video works virally — what psychological triggers, visual elements, or content structure makes it engaging and shareable.

4. ACTION PLAN: Provide 3-5 concrete, specific steps on how to adapt this video's successful elements for a social media content account. Be practical and actionable.

Format your response clearly with these exact section headers: TRANSCRIPTION, KEY TAKEAWAYS, VIRAL HOOK, ACTION PLAN.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    }
  );

  const geminiJson = await geminiRes.json();

  if (!geminiRes.ok) {
    throw new Error("Gemini API error: " + (geminiJson.error?.message ?? JSON.stringify(geminiJson)));
  }

  const fullText: string = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!fullText) throw new Error("Empty response from Gemini");

  const transcriptMatch = fullText.match(/TRANSCRIPTION[:\s]*([\s\S]*?)(?=KEY TAKEAWAYS|$)/i);
  const analysisMatch = fullText.match(/KEY TAKEAWAYS[\s\S]*/i);

  const transcript = transcriptMatch?.[1]?.trim() ?? "";
  const analysis = analysisMatch?.[0]?.trim() ?? fullText;

  await supabase.from("video_analyses").insert({
    video_url: videoUrl,
    transcript,
    analysis,
    requested_by: requestedBy,
  });

  return { transcript, analysis, full: fullText };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathname = url.pathname;

    if (pathname.endsWith("/analyze")) {
      const body = await req.json();
      const { video_url, requested_by } = body;

      if (!video_url) {
        return new Response(
          JSON.stringify({ ok: false, error: "video_url is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await handleAnalyze(supabase, video_url, requested_by ?? "admin");

      return new Response(
        JSON.stringify({ ok: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pathname.endsWith("/webhook")) {
      const update = await req.json();
      console.log("Incoming Telegram Update:", JSON.stringify(update));
      const message = update?.message;

      const { data: settingsRow } = await supabase
        .from("telegram_settings")
        .select("bot_token, hr_group_chat_id, hr_welcome_template, hr_last_welcome_message_id, myth_group_chat_id, myth_sources_reply, myth_tasks_reply, myth_music_reply")
        .eq("id", "11111111-1111-1111-1111-111111111111")
        .maybeSingle();

      const botToken = settingsRow?.bot_token ?? "";

      const newMembers = message?.new_chat_members ?? [];
      if (Array.isArray(newMembers) && newMembers.length > 0) {
        console.log("new_chat_members event detected, chat_id:", String(message.chat.id));

        const incomingChatId = String(message.chat.id).trim();
        const hrChatId = String(settingsRow?.hr_group_chat_id ?? "").trim();

        // Strip the -100 supergroup prefix before comparing so both forms match
        const normalise = (id: string) => id.replace(/^-?100/, "-");
        const chatMatch = incomingChatId === hrChatId ||
          normalise(incomingChatId) === normalise(hrChatId) ||
          incomingChatId.includes(hrChatId.replace("-100", "")) ||
          hrChatId.includes(incomingChatId.replace("-100", ""));

        console.log("HR chat ID from DB:", hrChatId, "| Incoming chat ID:", incomingChatId, "| Match:", chatMatch);

        if (hrChatId && chatMatch && botToken) {
          const prevMsgId = settingsRow?.hr_last_welcome_message_id ?? null;

          if (prevMsgId) {
            try {
              const delRes = await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: incomingChatId, message_id: Number(prevMsgId) }),
              });
              const delJson = await delRes.json();
              console.log("deleteMessage result:", JSON.stringify(delJson));
            } catch (delErr) {
              console.log("deleteMessage error (non-fatal, continuing):", String(delErr));
            }
          }

          const template = settingsRow?.hr_welcome_template ?? "Добро пожаловать, {name}!";
          const newUser = newMembers[0];
          const firstName = newUser.first_name || newUser.username || "Кандидат";
          const welcomeText = template.replace(/\{name\}/g, firstName);

          console.log("Sending HR welcome to:", firstName);

          try {
            const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: incomingChatId, text: welcomeText, parse_mode: "HTML" }),
            });
            const sendJson = await sendRes.json();
            console.log("sendMessage result:", JSON.stringify(sendJson));
            if (sendJson.ok) {
              const newMsgId = String(sendJson.result.message_id);
              await supabase
                .from("telegram_settings")
                .update({ hr_last_welcome_message_id: newMsgId })
                .eq("id", "11111111-1111-1111-1111-111111111111");
            }
          } catch (sendErr) {
            console.log("sendMessage error:", String(sendErr));
          }
        } else {
          console.log("HR group check failed — hrChatId empty, mismatch, or no botToken. Ignoring event.");
        }

        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!message?.text) {
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const text: string = message.text.trim();
      const chatId = String(message.chat.id);
      const rawSenderName: string = message.from?.first_name ?? message.from?.username ?? String(message.from?.id ?? "unknown");
      const username = message.from?.username ?? message.from?.first_name ?? String(message.from?.id);
      const chatTitle: string = message.chat?.title ?? "Личный чат";
      const senderName = `[${chatTitle}] ${rawSenderName}`;

      // Log every text message for AI daily summary
      EdgeRuntime.waitUntil(
        supabase.from("chat_history_log").insert({
          chat_id: chatId,
          sender_name: senderName,
          message_text: text,
        }).then(({ error }) => {
          if (error) console.log("chat_history_log insert error:", error.message);
        })
      );

      const sendReply = async (replyText: string) => {
        if (!botToken) return;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: "HTML" }),
        });
      };

      // Myth auto-reply: persistent reply keyboard + triggers
      {
        const mythChatIdRaw = String(settingsRow?.myth_group_chat_id ?? "").trim();
        const mythBaseChatId = mythChatIdRaw.includes("_") ? mythChatIdRaw.split("_")[0] : mythChatIdRaw;
        const sourcesReply = String(settingsRow?.myth_sources_reply ?? "").trim();
        const tasksReply = String(settingsRow?.myth_tasks_reply ?? "").trim();
        const musicReply = String(settingsRow?.myth_music_reply ?? "").trim();

        const lower = text.toLowerCase();
        let replyText: string | null = null;
        if (lower.includes("/sources") || lower.includes("исходники")) {
          replyText = sourcesReply;
        } else if (lower.includes("/tasks")) {
          replyText = tasksReply;
        } else if (lower.includes("/music")) {
          replyText = musicReply;
        }

        if (replyText !== null && mythBaseChatId && chatId === mythBaseChatId && botToken) {
          if (replyText) {
            const threadId = (message as { message_thread_id?: number })?.message_thread_id;
            const sendBody: Record<string, unknown> = {
              chat_id: chatId,
              text: replyText,
              parse_mode: "HTML",
              disable_web_page_preview: false,
            };
            if (typeof threadId === "number") sendBody.message_thread_id = threadId;

            try {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sendBody),
              });
            } catch (replyErr) {
              console.log("Myth auto-reply error:", String(replyErr));
            }
          }
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      if (text.startsWith("/analyze")) {
        const parts = text.split(" ");
        const videoUrl = parts[1] ?? "";

        if (!videoUrl || (!videoUrl.includes("youtube") && !videoUrl.includes("youtu.be") && !videoUrl.includes("instagram") && !videoUrl.includes("tiktok") && !videoUrl.startsWith("http"))) {
          await sendReply("Please provide a valid video URL.\nUsage: /analyze https://youtube.com/watch?v=...");
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await sendReply("Analyzing your video... This may take 15-30 seconds.");

        try {
          const result = await handleAnalyze(supabase, videoUrl, username);
          const maxLen = 4000;
          const replyText = result.full.length > maxLen ? result.full.substring(0, maxLen) + "\n\n[Truncated — full analysis saved to database]" : result.full;
          await sendReply(replyText);
        } catch (e) {
          await sendReply("Analysis failed: " + String(e));
        }
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const queryType = url.searchParams.get("type");

    if (queryType === "daily_availability") {
      const slotsStr = url.searchParams.get("slots") ?? "";

      if (!slotsStr.trim()) {
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: "No free slots — nothing to send" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: settingsRow, error: settingsErr } = await supabase
        .from("telegram_settings")
        .select("bot_token, daily_availability_text")
        .eq("id", "11111111-1111-1111-1111-111111111111")
        .maybeSingle();

      if (settingsErr) throw new Error("Failed to load settings: " + settingsErr.message);
      if (!settingsRow?.bot_token) throw new Error("Bot token not configured");

      const DEFAULT_AVAILABILITY_TEMPLATE =
        "🌙 Добрый вечер! На завтра есть свободные окна для съемки: {slots}. Успейте забронировать, пока время свободно: https://yallainfluencers.com/booking";

      const rawTemplate = settingsRow.daily_availability_text?.trim() || DEFAULT_AVAILABILITY_TEMPLATE;
      const messageText = rawTemplate.replace("{slots}", slotsStr);

      const { data: groups, error: groupsError } = await supabase
        .from("telegram_groups")
        .select("id, name, chat_id")
        .order("created_at");

      if (groupsError) throw new Error("Failed to load groups: " + groupsError.message);
      if (!groups?.length) throw new Error("No groups configured");

      const avResults: Array<{ name: string; chat_id: string; ok: boolean; error?: string }> = [];

      for (const group of groups) {
        try {
          const sendRes = await fetch(`https://api.telegram.org/bot${settingsRow.bot_token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: group.chat_id, text: messageText, parse_mode: "HTML" }),
          });
          const sendJson = await sendRes.json();
          if (sendJson.ok) {
            avResults.push({ name: group.name, chat_id: group.chat_id, ok: true });
          } else {
            avResults.push({ name: group.name, chat_id: group.chat_id, ok: false, error: sendJson.description });
          }
        } catch (e) {
          avResults.push({ name: group.name, chat_id: group.chat_id, ok: false, error: String(e) });
        }
      }

      return new Response(
        JSON.stringify({ ok: true, type: "daily_availability", slots: slotsStr, sent: avResults.filter(r => r.ok).length, failed: avResults.filter(r => !r.ok).length, results: avResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (queryType === "hr_broadcast") {
      const { data: settingsRow, error: settingsErr } = await supabase
        .from("telegram_settings")
        .select("bot_token, hr_group_chat_id, hr_broadcast_template, hr_last_broadcast_message_id")
        .eq("id", "11111111-1111-1111-1111-111111111111")
        .maybeSingle();

      if (settingsErr) throw new Error("Failed to load HR settings: " + settingsErr.message);
      if (!settingsRow?.bot_token) throw new Error("Bot token not configured");
      if (!settingsRow?.hr_group_chat_id) throw new Error("HR group chat ID not configured");
      if (!settingsRow?.hr_broadcast_template?.trim()) throw new Error("HR broadcast template not configured");

      const { bot_token, hr_group_chat_id, hr_broadcast_template, hr_last_broadcast_message_id } = settingsRow;

      if (hr_last_broadcast_message_id) {
        try {
          const delRes = await fetch(`https://api.telegram.org/bot${bot_token}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: hr_group_chat_id, message_id: Number(hr_last_broadcast_message_id) }),
          });
          const delJson = await delRes.json();
          console.log("HR broadcast deleteMessage result:", JSON.stringify(delJson));
        } catch (delErr) {
          console.log("HR broadcast deleteMessage error (non-fatal):", String(delErr));
        }
      }

      const sendRes = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: hr_group_chat_id, text: hr_broadcast_template, parse_mode: "HTML" }),
      });
      const sendJson = await sendRes.json();
      console.log("HR broadcast sendMessage result:", JSON.stringify(sendJson));

      if (sendJson.ok) {
        const newMsgId = String(sendJson.result.message_id);
        await supabase
          .from("telegram_settings")
          .update({ hr_last_broadcast_message_id: newMsgId })
          .eq("id", "11111111-1111-1111-1111-111111111111");
        return new Response(
          JSON.stringify({ ok: true, type: "hr_broadcast", message_id: newMsgId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        throw new Error("Telegram sendMessage failed: " + (sendJson.description ?? JSON.stringify(sendJson)));
      }
    }

    if (queryType === "set_webhook") {
      const { data: settingsRow, error: settingsErr } = await supabase
        .from("telegram_settings")
        .select("bot_token")
        .eq("id", "11111111-1111-1111-1111-111111111111")
        .maybeSingle();

      if (settingsErr) throw new Error("Failed to load settings: " + settingsErr.message);
      if (!settingsRow?.bot_token) throw new Error("Bot token not configured");

      const webhookUrl = `${supabaseUrl}/functions/v1/telegram-broadcast/webhook`;

      const tgRes = await fetch(`https://api.telegram.org/bot${settingsRow.bot_token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "edited_message"],
          drop_pending_updates: false,
        }),
      });
      const tgJson = await tgRes.json();

      if (!tgJson.ok) {
        throw new Error("Telegram setWebhook failed: " + (tgJson.description ?? JSON.stringify(tgJson)));
      }

      const commandsPayload = {
        commands: [
          { command: "sources", description: "📁 Ссылки на исходники" },
          { command: "tasks", description: "📋 Задачи на сегодня" },
          { command: "music", description: "🎵 Музыка и референсы" },
        ],
      };

      const cmdRes = await fetch(`https://api.telegram.org/bot${settingsRow.bot_token}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commandsPayload),
      });
      const cmdJson = await cmdRes.json();

      return new Response(
        JSON.stringify({
          ok: true,
          type: "set_webhook",
          webhook_url: webhookUrl,
          webhook: { result: tgJson.result, description: tgJson.description },
          commands: { ok: cmdJson.ok === true, result: cmdJson.result, description: cmdJson.description },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (queryType === "myth_broadcast") {
      const { data: settingsRow, error: settingsErr } = await supabase
        .from("telegram_settings")
        .select("bot_token, myth_group_name, myth_group_chat_id, myth_broadcast_template, myth_last_message_id")
        .eq("id", "11111111-1111-1111-1111-111111111111")
        .maybeSingle();

      if (settingsErr) throw new Error("Failed to load Myth settings: " + settingsErr.message);
      if (!settingsRow?.bot_token) throw new Error("Bot token not configured");
      if (!settingsRow?.myth_group_chat_id) throw new Error("Myth group chat ID not configured");
      if (!settingsRow?.myth_broadcast_template?.trim()) throw new Error("Myth broadcast template not configured");

      const { bot_token, myth_group_chat_id, myth_broadcast_template } = settingsRow;

      // "-1003799481157_1" → chat_id="-1003799481157", message_thread_id=1 (Telegram topic/thread support)
      const rawId: string = String(myth_group_chat_id).trim();
      const underscoreIdx = rawId.indexOf("_");
      const chatId = underscoreIdx >= 0 ? rawId.slice(0, underscoreIdx) : rawId;
      const threadPart = underscoreIdx >= 0 ? rawId.slice(underscoreIdx + 1) : "";
      const threadId = threadPart && /^\d+$/.test(threadPart) ? Number(threadPart) : null;

      const sendBody: Record<string, unknown> = {
        chat_id: chatId,
        text: myth_broadcast_template,
        parse_mode: "HTML",
      };
      if (threadId !== null) sendBody.message_thread_id = threadId;

      const sendRes = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendBody),
      });
      const sendJson = await sendRes.json();
      console.log("Myth broadcast sendMessage result:", JSON.stringify(sendJson));

      if (sendJson.ok) {
        const newMsgId = String(sendJson.result.message_id);
        await supabase
          .from("telegram_settings")
          .update({ myth_last_message_id: newMsgId })
          .eq("id", "11111111-1111-1111-1111-111111111111");
        return new Response(
          JSON.stringify({ ok: true, type: "myth_broadcast", chat_id: chatId, thread_id: threadId, message_id: newMsgId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } else {
        throw new Error("Telegram sendMessage failed: " + (sendJson.description ?? JSON.stringify(sendJson)));
      }
    }

    let broadcastType = "weekly";
    try {
      const body = await req.json();
      if (body?.type === "daily") broadcastType = "daily";
    } catch (_) {}

    const broadcastResult = await handleBroadcast(supabase, broadcastType);

    return new Response(
      JSON.stringify({ ok: true, ...broadcastResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
