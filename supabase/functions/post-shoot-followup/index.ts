import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getNowDubai(): Date {
  const now = new Date();
  const dubaiOffset = 4 * 60;
  const dubaiMs = now.getTime() + (dubaiOffset - now.getTimezoneOffset()) * 60000;
  return new Date(dubaiMs);
}

function getDubaiDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildFollowUpMessage(name: string): string {
  return [
    `Hello ${name}! I see your shoot has just wrapped up. Hope you enjoyed the process! 🎥`,
    ``,
    `We're filling up fast, so I recommend booking your next slots now while they're still available.`,
    ``,
    `---`,
    ``,
    `Вижу, ваша съемка завершилась! Надеюсь, всё прошло круто. Рекомендую сразу забронировать следующие слоты, так как места ограничены! 🔥`,
    ``,
    `Book here: https://yallainfluencers.com/`,
  ].join("\n");
}

async function sendWhatsApp(
  greenApiUrl: string,
  greenApiId: string,
  greenApiToken: string,
  chatId: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiEndpoint = `${greenApiUrl}/waInstance${greenApiId}/sendMessage/${greenApiToken}`;
    const resp = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });
    const data = await resp.json();
    return { ok: resp.ok, error: resp.ok ? undefined : JSON.stringify(data) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
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

    if (!GREEN_API_URL || !GREEN_API_ID || !GREEN_API_TOKEN) {
      return new Response(
        JSON.stringify({ ok: false, reason: "GREEN_API secrets not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const dubaiNow = getNowDubai();
    const todayStr = getDubaiDateStr(dubaiNow);

    const dubaiHHMM =
      String(dubaiNow.getUTCHours()).padStart(2, "0") + ":" +
      String(dubaiNow.getUTCMinutes()).padStart(2, "0");

    // Find bookings whose end_time is between 55 and 75 minutes ago (Dubai time)
    // The cron fires every hour, so we look for end_times that passed ~1 hour ago.
    const windowStart = new Date(dubaiNow.getTime() - 75 * 60 * 1000);
    const windowEnd   = new Date(dubaiNow.getTime() - 55 * 60 * 1000);

    const wsHHMM =
      String(windowStart.getUTCHours()).padStart(2, "0") + ":" +
      String(windowStart.getUTCMinutes()).padStart(2, "0");
    const weHHMM =
      String(windowEnd.getUTCHours()).padStart(2, "0") + ":" +
      String(windowEnd.getUTCMinutes()).padStart(2, "0");

    const { data: bookings, error } = await supabase
      .from("booking_events")
      .select("id, client_name, whatsapp, end_time, followup_sent")
      .eq("date", todayStr)
      .neq("status", "cancelled")
      .eq("followup_sent", false)
      .gte("end_time", wsHHMM)
      .lte("end_time", weHHMM);

    if (error) throw new Error(`DB query failed: ${error.message}`);

    const results: Array<{ id: string; phone: string; status: string; error?: string }> = [];

    for (const booking of (bookings ?? [])) {
      if (!booking.whatsapp) {
        results.push({ id: booking.id, phone: "", status: "skipped_no_phone" });
        continue;
      }

      const rawPhone = booking.whatsapp.replace(/\D/g, "");
      const chatId = `${rawPhone}@c.us`;
      const name = booking.client_name || "there";

      const message = buildFollowUpMessage(name);
      const sendResult = await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, chatId, message);

      if (sendResult.ok) {
        await supabase
          .from("booking_events")
          .update({ followup_sent: true })
          .eq("id", booking.id);
      }

      results.push({
        id: booking.id,
        phone: rawPhone,
        status: sendResult.ok ? "sent" : "failed",
        error: sendResult.error,
      });
    }

    const sent = results.filter(r => r.status === "sent").length;

    return new Response(
      JSON.stringify({ ok: true, dubaiHHMM, windowStart: wsHHMM, windowEnd: weHHMM, sent, total: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
