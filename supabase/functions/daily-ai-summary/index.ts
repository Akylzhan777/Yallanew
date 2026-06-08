import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load AI summary settings from app_settings (single-row table)
    const { data: settings, error: settingsErr } = await supabase
      .from("app_settings")
      .select("gemini_api_key, green_api_id_instance, green_api_token_instance, ai_summary_recipient")
      .limit(1)
      .maybeSingle();

    if (settingsErr) throw new Error("Failed to load app_settings: " + settingsErr.message);
    if (!settings?.gemini_api_key?.trim()) throw new Error("Gemini API key not configured");
    if (!settings?.green_api_id_instance?.trim()) throw new Error("Green API idInstance not configured");
    if (!settings?.green_api_token_instance?.trim()) throw new Error("Green API apiTokenInstance not configured");

    const recipient = settings.ai_summary_recipient?.trim() || "971585973177@c.us";

    // Fetch unsummarized messages from the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: messages, error: msgErr } = await supabase
      .from("chat_history_log")
      .select("id, sender_name, message_text, created_at")
      .eq("summarized", false)
      .gte("created_at", since)
      .order("created_at");

    if (msgErr) throw new Error("Failed to load chat history: " + msgErr.message);

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "No new messages in the last 24 hours" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const transcript = messages
      .map((m) => `${m.sender_name}: ${m.message_text}`)
      .join("\n");

    // Summarise with Google Gemini via dynamic model discovery
    const GEMINI_API_KEY = settings.gemini_api_key;
    const chat_text = transcript;

    // 1. Получаем список всех доступных моделей для ключа
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    const listData = await listResponse.json();

    if (!listResponse.ok) throw new Error(`List Models Error: ${JSON.stringify(listData)}`);

    // 2. Ищем первую модель, которая поддерживает генерацию текста
    const validModel = listData.models.find((m: { name: string; supportedGenerationMethods: string[] }) =>
      m.supportedGenerationMethods.includes('generateContent') &&
      m.name.includes('gemini')
    );

    if (!validModel) throw new Error('Не найдено ни одной доступной модели для этого ключа.');

    // 3. Отправляем запрос в найденную модель (validModel.name уже содержит приставку models/)
    const promptText = "Ты главный ИИ-продюсер видеопродакшена. Ниже представлена переписка команды из РАЗНЫХ рабочих чатов за сутки. Твоя задача — сделать подробную, структурированную и развернутую выжимку.\n\nОБЯЗАТЕЛЬНО группируй отчет по названиям чатов (проектов). Для каждого проекта выдели:\n🎬 Обсуждаемые задачи и статусы.\n📁 Исходники и файлы (что сдали, что просят).\n⚠️ Проблемы или важные вопросы.\n\nПиши детально, развернуто, но без воды. Если чатов несколько, визуально отделяй их друг от друга. Не придумывай того, чего не было.\n\nЛоги переписки:\n\n" + (chat_text || "Нет сообщений за сегодня.");

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const geminiData = await geminiResponse.json();
    if (!geminiResponse.ok) throw new Error(`Generate Error: ${JSON.stringify(geminiData)}`);

    const ai_response = geminiData.candidates[0].content.parts[0].text;

    const summary: string = ai_response;

    const whatsappText = `🤖 *Глобальная нейро-сводка по проектам за 24 часа:*\n\n${summary}`;

    // Send via Green API
    const greenUrl = `https://api.green-api.com/waInstance${settings.green_api_id_instance}/sendMessage/${settings.green_api_token_instance}`;

    const greenRes = await fetch(greenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: recipient, message: whatsappText }),
    });
    const greenJson = await greenRes.json();

    if (!greenRes.ok) {
      throw new Error("Green API error: " + JSON.stringify(greenJson));
    }

    // Mark messages as summarized
    const ids = messages.map((m) => m.id);
    const { error: updateErr } = await supabase
      .from("chat_history_log")
      .update({ summarized: true })
      .in("id", ids);

    if (updateErr) console.log("Failed to mark messages summarized:", updateErr.message);

    return new Response(
      JSON.stringify({
        ok: true,
        messages_processed: messages.length,
        recipient,
        green_api: greenJson,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
