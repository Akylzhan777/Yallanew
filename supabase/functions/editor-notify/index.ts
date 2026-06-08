import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const GREEN_API_URL = Deno.env.get("GREEN_API_URL");
    const GREEN_API_ID = Deno.env.get("GREEN_API_ID");
    const GREEN_API_TOKEN = Deno.env.get("GREEN_API_TOKEN");

    if (!GREEN_API_URL || !GREEN_API_ID || !GREEN_API_TOKEN) {
      return jsonResponse({ ok: false, reason: "GREEN_API secrets not configured on the server" });
    }

    let body: { phone?: unknown; type?: unknown; taskName?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, reason: "Invalid JSON body" });
    }

    const { phone, type, taskName } = body;

    if (!phone) {
      return jsonResponse({ ok: false, reason: "No phone number provided" });
    }

    if (!type || (type !== "REMINDER" && type !== "NEW_TASK")) {
      return jsonResponse({ ok: false, reason: "Invalid type. Use REMINDER or NEW_TASK" });
    }

    const rawPhone = String(phone).replace(/\D/g, "");
    const chatId = `${rawPhone}@c.us`;

    let message: string;
    if (type === "REMINDER") {
      message =
        "🚀 Привет! На портале появились свободные заказы. " +
        "Заходи, забирай задачи в работу и руби кэш!";
    } else {
      const name = taskName ? String(taskName) : "Новая задача";
      message =
        `🎬 Привет! Тебе назначена новая задача: ${name}. ` +
        "Дедлайн пошел (48 часов). Проверь портал!";
    }

    const apiEndpoint = `${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`;

    let resp: Response;
    let responseData: unknown;
    try {
      resp = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message }),
      });
      try {
        responseData = await resp.json();
      } catch {
        responseData = { raw: await resp.text().catch(() => "") };
      }
    } catch (fetchErr) {
      return jsonResponse({ ok: false, reason: `Network error reaching Green API: ${String(fetchErr)}` });
    }

    if (!resp.ok) {
      return jsonResponse({
        ok: false,
        reason: `Green API returned HTTP ${resp.status}`,
        details: responseData,
      });
    }

    return jsonResponse({ ok: true, idMessage: (responseData as { idMessage?: string })?.idMessage });
  } catch (err) {
    return jsonResponse({ ok: false, reason: `Unexpected error: ${String(err)}` });
  }
});
