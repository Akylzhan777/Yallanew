import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function subtractOneHour(time: string): string {
  const [h, m] = time.substring(0, 5).split(":").map(Number);
  const total = h * 60 + m - 60;
  const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const mm = ((total % 1440) + 1440) % 1440 % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

async function sendWhatsApp(
  apiUrl: string,
  instanceId: string,
  token: string,
  phone: string,
  role: string,
  message: string,
): Promise<{ role: string; phone: string; ok: boolean; error?: string }> {
  try {
    const chatId = `${phone.replace(/\D/g, "")}@c.us`;
    const endpoint = `${apiUrl}/waInstance${instanceId}/sendMessage/${token}`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });
    return { role, phone, ok: resp.ok };
  } catch (err) {
    return { role, phone, ok: false, error: String(err) };
  }
}

interface Booking {
  id: string;
  client_name: string;
  whatsapp: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  task_description: string | null;
  scripts_notes: string | null;
  pickup_location: string | null;
  operator_id: string | null;
}

interface Operator {
  id: string;
  name: string;
  phone_number: string;
}

const DEFAULT_TEMPLATE = `--- СЪЕМКА {{shoot_index}} ---
👤 Клиент: {{client_name}}
📱 Телефон: {{client_phone}}
📍 Локация: {{shoot_location}}
🚗 Время выезда: {{departure_time}} (за 1 час до начала)
🎥 Время съемки: {{shoot_time}}
💼 Услуга: {{task_description}}
📋 Заметки: {{scripts_notes}}

📸 Оператор: {{operator_name}}
📲 WhatsApp оператора: {{operator_phone}}
🗺 Точка сбора оператора: {{pickup_location}}`;

function applyTemplate(
  template: string,
  booking: Booking,
  operator: Operator | null,
  index: number,
): string {
  const startTime = booking.start_time ? booking.start_time.substring(0, 5) : "—";
  const endTime = booking.end_time ? booking.end_time.substring(0, 5) : "—";
  const departureTime = booking.start_time ? subtractOneHour(booking.start_time) : "—";
  const rawPhone = booking.whatsapp ? booking.whatsapp.replace(/\D/g, "") : null;

  const replacements: Record<string, string> = {
    "{{shoot_index}}": String(index),
    "{{client_name}}": booking.client_name || "—",
    "{{client_phone}}": rawPhone ? `+${rawPhone}` : "—",
    "{{shoot_location}}": booking.location || "Ждет назначения / TBD",
    "{{departure_time}}": departureTime,
    "{{shoot_time}}": `${startTime} – ${endTime}`,
    "{{task_description}}": booking.task_description || "—",
    "{{scripts_notes}}": booking.scripts_notes || "—",
    "{{operator_name}}": operator?.name || "Не назначен",
    "{{operator_phone}}": operator?.phone_number ? `+${operator.phone_number.replace(/\D/g, "")}` : "—",
    "{{pickup_location}}": booking.pickup_location || "—",
  };

  let result = template;
  for (const [tag, value] of Object.entries(replacements)) {
    result = result.split(tag).join(value);
  }
  return result;
}

function buildDriverMessage(
  bookings: Booking[],
  operatorMap: Map<string, Operator>,
  template: string,
  headerTitle: string,
  formattedDate: string,
): string {
  const header = `🗓 *${headerTitle}*\n${formattedDate}\n(Всего съёмок: ${bookings.length})`;

  if (bookings.length === 0) {
    return `🗓 *${headerTitle}*\n${formattedDate}\n\nСъемок не запланировано. No shoots scheduled.`;
  }

  const blocks = bookings.map((b, idx) => {
    const operator = b.operator_id ? (operatorMap.get(b.operator_id) ?? null) : null;
    return applyTemplate(template, b, operator, idx + 1);
  });

  return `${header}\n\n${blocks.join("\n\n")}`;
}

function buildOperatorMessage(
  bookings: Booking[],
  operatorMap: Map<string, Operator>,
  template: string,
  operatorName: string,
  formattedDate: string,
): string {
  const header = `🗓 *МОЁ РАСПИСАНИЕ НА ЗАВТРА — ${operatorName.toUpperCase()}*\n${formattedDate}\n(Съёмок: ${bookings.length})`;

  if (bookings.length === 0) {
    return `🗓 *МОЁ РАСПИСАНИЕ НА ЗАВТРА — ${operatorName.toUpperCase()}*\n${formattedDate}\n\nСъемок не запланировано.`;
  }

  const blocks = bookings.map((b, idx) => {
    const operator = b.operator_id ? (operatorMap.get(b.operator_id) ?? null) : null;
    return applyTemplate(template, b, operator, idx + 1);
  });

  return `${header}\n\n${blocks.join("\n\n")}`;
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
    const DRIVER_PHONE = Deno.env.get("DRIVER_PHONE");

    if (!GREEN_API_URL || !GREEN_API_ID || !GREEN_API_TOKEN) {
      return new Response(
        JSON.stringify({ ok: false, reason: "GREEN_API secrets not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const dayNames = ["воскресенья", "понедельника", "вторника", "среды", "четверга", "пятницы", "субботы"];
    const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    const dayOfWeek = dayNames[tomorrow.getUTCDay()];
    const formattedDate = `${tomorrow.getUTCDate()} ${months[tomorrow.getUTCMonth()]} (${dayOfWeek})`;

    const [
      { data: bookings, error: bookingsError },
      { data: operators, error: operatorsError },
      { data: templateRow },
    ] = await Promise.all([
      supabase
        .from("booking_events")
        .select("id, client_name, whatsapp, start_time, end_time, location, task_description, scripts_notes, pickup_location, operator_id")
        .eq("date", tomorrowStr)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true }),
      supabase
        .from("operators")
        .select("id, name, phone_number")
        .neq("phone_number", ""),
      supabase
        .from("message_templates")
        .select("value")
        .eq("key", "driver_schedule_template")
        .maybeSingle(),
    ]);

    if (bookingsError) throw new Error(`Bookings query failed: ${bookingsError.message}`);
    if (operatorsError) throw new Error(`Operators query failed: ${operatorsError.message}`);

    const allBookings: Booking[] = bookings ?? [];
    const operatorList: Operator[] = (operators ?? []).filter((o: Operator) => o.phone_number.trim() !== "");
    const template: string = templateRow?.value || DEFAULT_TEMPLATE;

    const operatorMap = new Map<string, Operator>(operatorList.map((o) => [o.id, o]));

    const dispatch: Array<{ role: string; phone: string; ok: boolean; error?: string }> = [];

    for (const op of operatorList) {
      const opBookings = allBookings.filter(b => b.operator_id === op.id);
      const message = buildOperatorMessage(opBookings, operatorMap, template, op.name, formattedDate);
      const result = await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, op.phone_number, `operator:${op.name}`, message);
      dispatch.push(result);
    }

    if (DRIVER_PHONE) {
      const masterMessage = buildDriverMessage(
        allBookings,
        operatorMap,
        template,
        "РАСПИСАНИЕ НА ЗАВТРА / SCHEDULE FOR TOMORROW",
        formattedDate,
      );
      const result = await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, DRIVER_PHONE, "driver", masterMessage);
      dispatch.push(result);
    }

    if (dispatch.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, reason: "No recipients: add phone numbers to operators or set DRIVER_PHONE secret." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const allOk = dispatch.every((r) => r.ok);

    return new Response(
      JSON.stringify({ ok: allOk, bookingCount: allBookings.length, operatorsNotified: operatorList.length, dispatch }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
