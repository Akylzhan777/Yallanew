import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendWhatsApp(
  greenApiUrl: string,
  greenApiId: string,
  greenApiToken: string,
  chatId: string,
  message: string
): Promise<void> {
  const apiEndpoint = `${greenApiUrl}/waInstance${greenApiId}/sendMessage/${greenApiToken}`;
  await fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GREEN_API_URL = Deno.env.get("GREEN_API_URL");
    const GREEN_API_ID = Deno.env.get("GREEN_API_ID");
    const GREEN_API_TOKEN = Deno.env.get("GREEN_API_TOKEN");
    const ADMIN_PHONE = Deno.env.get("ADMIN_PHONE");

    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ ok: false, reason: "booking_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: booking, error: fetchError } = await supabase
      .from("booking_events")
      .select("id, client_name, whatsapp, date, start_time, end_time")
      .eq("id", booking_id)
      .maybeSingle();

    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
    if (!booking) {
      return new Response(
        JSON.stringify({ ok: false, reason: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: deleteError } = await supabase
      .from("booking_events")
      .delete()
      .eq("id", booking_id);

    if (deleteError) throw new Error(`Delete error: ${deleteError.message}`);

    if (GREEN_API_URL && GREEN_API_ID && GREEN_API_TOKEN && ADMIN_PHONE) {
      const name = booking.client_name || "Unknown";
      const phone = booking.whatsapp || "—";
      const date = booking.date || "—";
      const start = booking.start_time ? String(booking.start_time).substring(0, 5) : "—";
      const end = booking.end_time ? String(booking.end_time).substring(0, 5) : "—";

      const adminMessage =
        `❌ ОТМЕНА БРОНИ: Клиент ${name} (${phone}) отменил съемку на ${date} (${start} - ${end}). Слот снова свободен!`;

      const adminChatId = `${ADMIN_PHONE.replace(/\D/g, "")}@c.us`;
      await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, adminChatId, adminMessage);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
