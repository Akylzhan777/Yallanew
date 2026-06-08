import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BOT_TOKEN = "8708200263:AAHyTaI-HM5ICH805r3usAKQNlQozbpqud4";
const CHAT_ID = "-1003854532235";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const token = BOT_TOKEN;
    const chatId = CHAT_ID;

    const body = await req.json();
    const { event_type, client_name, amount, details, ai_translation, ai_translation_lang, video_source, comment } = body;

    let text = "";
    if (event_type === "purchase") {
      text = `💰 <b>Новая оплата!</b>\n👤 Клиент: ${client_name}\n📦 Пакет: ${details}\n💵 Сумма: ${amount}`;
    } else if (event_type === "booking") {
      const aiLine = ai_translation && ai_translation_lang
        ? `\n\n🤖 <b>Выбран ИИ-перевод!</b> Язык: ${ai_translation_lang}`
        : "";
      text = `🎥 <b>Новая бронь съемки!</b>\n👤 Клиент: ${client_name}\n📌 Услуга: ${details}${aiLine}`;
    } else if (event_type === "AI_Request") {
      const commentLine = comment ? `\n💬 Комментарий: ${comment}` : "";
      text = `🤖 <b>Новая заявка на ИИ-перевод!</b>\n👤 Клиент: ${client_name}\n🌐 Язык: <b>${ai_translation_lang}</b>\n📁 Источник: ${video_source}${commentLine}`;
    } else if (event_type === "ai_audio_request") {
      text = `🎙️ <b>Новая заявка на ИИ-Улучшение звука!</b>\n📋 ${details}`;
    } else {
      return new Response(JSON.stringify({ error: `Unknown event_type: ${event_type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });

    const result = await resp.json();

    if (!resp.ok) {
      return new Response(JSON.stringify({ telegram_error: result }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
