import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const GREEN_API_URL = Deno.env.get("GREEN_API_URL");
    const GREEN_API_ID = Deno.env.get("GREEN_API_ID");
    const GREEN_API_TOKEN = Deno.env.get("GREEN_API_TOKEN");

    if (!GREEN_API_URL || !GREEN_API_ID || !GREEN_API_TOKEN) {
      return new Response(
        JSON.stringify({ ok: false, reason: "GREEN_API secrets not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { id, name, phone, date, startTime, endTime } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ ok: false, reason: "No phone number provided" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawPhone = String(phone).replace(/\D/g, "");
    const chatId = `${rawPhone}@c.us`;

    const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const start = startTime ? String(startTime).substring(0, 5) : "start";
    const end = endTime ? String(endTime).substring(0, 5) : "end";
    const clientName = name || "there";

    const cancelLine = id
      ? `\n\nДля отмены бронирования / To cancel your booking:\nhttps://yallainfluencers.com/cancel/${id}`
      : "";

    const message =
      `Hello ${clientName}! 🎥 Your booking for ${formattedDate} from ${start} to ${end} is CONFIRMED.\n\n` +
      `Please do not reply to this message. If you don't have scripts, texts, or a location yet, Akyl will send them to you shortly.\n\n` +
      `---\n\n` +
      `Здравствуйте, ${clientName}! 🎥 Ваше бронирование на ${formattedDate} с ${start} до ${end} ПОДТВЕРЖДЕНО.\n\n` +
      `Пожалуйста, не отвечайте на это сообщение. Если у вас еще нет текстов, скриптов или локации, Акыл пришлет их вам чуть позже.` +
      cancelLine;

    const apiEndpoint = `${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`;
    const resp = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });

    const responseData = await resp.json();

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ ok: false, reason: "Green API error", details: responseData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, idMessage: responseData.idMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
