import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getDubaiDateStr(offsetDays: number): string {
  const now = new Date();
  const dubaiOffset = 4 * 60;
  const dubaiMs = now.getTime() + (dubaiOffset - now.getTimezoneOffset()) * 60000;
  const dubai = new Date(dubaiMs);
  dubai.setDate(dubai.getDate() + offsetDays);
  const y = dubai.getFullYear();
  const m = String(dubai.getMonth() + 1).padStart(2, "0");
  const d = String(dubai.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDubaiHour(): number {
  const now = new Date();
  const dubaiOffset = 4 * 60;
  const dubaiMs = now.getTime() + (dubaiOffset - now.getTimezoneOffset()) * 60000;
  return new Date(dubaiMs).getUTCHours();
}

const RU_MONTHS: Record<string, string> = {
  "01": "января", "02": "февраля", "03": "марта", "04": "апреля",
  "05": "мая", "06": "июня", "07": "июля", "08": "августа",
  "09": "сентября", "10": "октября", "11": "ноября", "12": "декабря",
};

function formatDateRu(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${RU_MONTHS[m] ?? m}`;
}

function buildMorningMessage(name: string, time: string, bookingId: string): string {
  const cancelLine = `\n\nДля отмены бронирования / To cancel your booking:\nhttps://yallainfluencers.com/cancel/${bookingId}`;
  return [
    `Hello ${name}! 🎬`,
    ``,
    `Today is your video shoot day!`,
    `Your session starts at ${time}.`,
    ``,
    `Привет, ${name}! 🎬`,
    ``,
    `Сегодня день вашей съемки!`,
    `Ваша сессия начинается в ${time}.`,
    ``,
    `_Do not reply to this message / Не отвечайте на это сообщение_`,
  ].join("\n") + cancelLine;
}

function buildEveningMessage(name: string, time: string, daysAhead: number, bookingId: string): string {
  const enDay = daysAhead === 1 ? "tomorrow" : "in 2 days";
  const ruDay = daysAhead === 1 ? "завтра" : "послезавтра";
  const cancelLine = `\n\nДля отмены бронирования / To cancel your booking:\nhttps://yallainfluencers.com/cancel/${bookingId}`;
  return [
    `Hello ${name}! 🎬`,
    ``,
    `This is a reminder that your video shoot is ${enDay} at ${time}.`,
    `We look forward to seeing you!`,
    ``,
    `Привет, ${name}! 🎬`,
    ``,
    `Напоминаем, что ваша съемка ${ruDay} в ${time}.`,
    `Будем рады вас видеть!`,
    ``,
    `_Do not reply to this message / Не отвечайте на это сообщение_`,
  ].join("\n") + cancelLine;
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
    const ADMIN_PHONE = Deno.env.get("ADMIN_PHONE");

    if (!GREEN_API_URL || !GREEN_API_ID || !GREEN_API_TOKEN) {
      return new Response(
        JSON.stringify({ ok: false, reason: "GREEN_API secrets not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const dubaiHour = getDubaiHour();

    let targetDates: Array<{ dateStr: string; daysAhead: number }>;
    let mode: string;

    if (dubaiHour < 12) {
      mode = "morning";
      targetDates = [{ dateStr: getDubaiDateStr(0), daysAhead: 0 }];
    } else {
      mode = "evening";
      targetDates = [
        { dateStr: getDubaiDateStr(1), daysAhead: 1 },
        { dateStr: getDubaiDateStr(2), daysAhead: 2 },
      ];
    }

    const results: Array<{ id: string; phone: string; status: string; error?: string }> = [];

    for (const { dateStr, daysAhead } of targetDates) {
      const { data: bookings, error } = await supabase
        .from("booking_events")
        .select("id, client_name, whatsapp, start_time")
        .eq("date", dateStr)
        .neq("status", "cancelled");

      if (error) throw new Error(`DB query failed: ${error.message}`);
      if (!bookings || bookings.length === 0) continue;

      for (const booking of bookings) {
        if (!booking.whatsapp) {
          results.push({ id: booking.id, phone: "", status: "skipped_no_phone" });
          continue;
        }

        const rawPhone = booking.whatsapp.replace(/\D/g, "");
        const chatId = `${rawPhone}@c.us`;
        const time = booking.start_time ? booking.start_time.substring(0, 5) : "your scheduled time";
        const name = booking.client_name || "there";

        const message = daysAhead === 0
          ? buildMorningMessage(name, time, booking.id)
          : buildEveningMessage(name, time, daysAhead, booking.id);

        const sendResult = await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, chatId, message);
        results.push({
          id: booking.id,
          phone: rawPhone,
          status: sendResult.ok ? "sent" : "failed",
          error: sendResult.error,
        });
      }
    }

    // Admin digest — sent only during evening run
    let adminDigestStatus = "skipped";
    if (mode === "evening" && ADMIN_PHONE) {
      const tomorrowStr = getDubaiDateStr(1);

      const { data: futureBookings, error: futureError } = await supabase
        .from("booking_events")
        .select("id, client_name, whatsapp, date, start_time, end_time")
        .gte("date", tomorrowStr)
        .neq("status", "cancelled")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (futureError) throw new Error(`Admin digest query failed: ${futureError.message}`);

      if (futureBookings && futureBookings.length > 0) {
        const lines: string[] = [
          `📋 ВАШИ ПРЕДСТОЯЩИЕ СЪЕМКИ:`,
          `--------------------------`,
        ];

        let currentDate = "";
        for (const b of futureBookings) {
          if (b.date !== currentDate) {
            currentDate = b.date;
            lines.push(`📅 ${formatDateRu(b.date)}`);
          }
          const start = b.start_time ? b.start_time.substring(0, 5) : "?";
          const end = b.end_time ? b.end_time.substring(0, 5) : "?";
          const phone = b.whatsapp || "—";
          lines.push(`⏰ ${start} - ${end} | 👤 ${b.client_name || "—"} | 📞 ${phone}`);
        }

        lines.push(`--------------------------`);
        lines.push(`Всего: ${futureBookings.length} съёмок`);

        const adminChatId = `${ADMIN_PHONE.replace(/\D/g, "")}@c.us`;
        const adminResult = await sendWhatsApp(
          GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN,
          adminChatId,
          lines.join("\n")
        );
        adminDigestStatus = adminResult.ok ? "sent" : `failed: ${adminResult.error}`;
      } else {
        adminDigestStatus = "no_future_bookings";
      }
    }

    const sent = results.filter(r => r.status === "sent").length;

    return new Response(
      JSON.stringify({ ok: true, mode, sent, total: results.length, adminDigestStatus, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
