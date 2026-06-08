import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { creator_id, client_name, client_phone, booking_date, booking_time, details } = body;

    if (!creator_id || !client_name || !booking_date || !booking_time) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Insert booking
    const { data: booking, error: bookingErr } = await supabase
      .from("creator_bookings")
      .insert({
        creator_id,
        client_name,
        client_phone: client_phone ?? "",
        client_email: body.client_email ?? "",
        booking_date,
        booking_time,
        details: details ?? "",
        status: "pending",
      })
      .select()
      .maybeSingle();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: bookingErr?.message ?? "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch creator's whatsapp_number
    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("whatsapp_number, display_name")
      .eq("id", creator_id)
      .maybeSingle();

    const whatsappNumber = creatorProfile?.whatsapp_number as string | null | undefined;

    if (whatsappNumber) {
      const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
      const token = Deno.env.get("GREEN_API_TOKEN");

      if (instanceId && token) {
        const dateFormatted = new Date(booking_date).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        // Calculate net amount if package price is provided
        const clientPaid = body.package_price ? Number(body.package_price) : 0;
        const netAmount = clientPaid > 0 ? Math.round(clientPaid - clientPaid * 0.20) : 0;

        const earningsLine = netAmount > 0
          ? `\nВы заработаете: ${netAmount.toLocaleString("ru-RU")} KZT (комиссия платформы удержана).`
          : "";

        const message =
          `🚀 Новая бронь на Yalla Influencers!\n` +
          `Дата: ${dateFormatted}\n` +
          `Время: ${booking_time}\n` +
          `Заказчик: ${client_name}` +
          (client_phone ? `\nТелефон: ${client_phone}` : "") +
          earningsLine +
          (details ? `\nПожелания: ${details}` : "") +
          `\n\nЗайдите в личный кабинет для деталей.`;

        // Normalize phone: strip non-digits, ensure no leading +
        const phone = whatsappNumber.replace(/\D/g, "");

        await fetch(
          `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
          },
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, booking_id: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
