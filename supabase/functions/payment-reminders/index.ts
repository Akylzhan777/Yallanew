import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getDubaiDateStr(offsetDays = 0): string {
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

const RU_MONTHS: Record<string, string> = {
  "01": "января", "02": "февраля", "03": "марта", "04": "апреля",
  "05": "мая", "06": "июня", "07": "июля", "08": "августа",
  "09": "сентября", "10": "октября", "11": "ноября", "12": "декабря",
};

function formatDateRu(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${RU_MONTHS[m] ?? m} ${y}`;
}

async function sendWhatsApp(
  greenApiUrl: string,
  greenApiId: string,
  greenApiToken: string,
  chatId: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const endpoint = `${greenApiUrl}/waInstance${greenApiId}/sendMessage/${greenApiToken}`;
    const resp = await fetch(endpoint, {
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
    const GREEN_API_URL = Deno.env.get("GREEN_API_URL");
    const GREEN_API_ID = Deno.env.get("GREEN_API_ID");
    const GREEN_API_TOKEN = Deno.env.get("GREEN_API_TOKEN");

    if (!GREEN_API_URL || !GREEN_API_ID || !GREEN_API_TOKEN) {
      return new Response(
        JSON.stringify({ ok: false, reason: "GREEN_API secrets not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: settings, error: settingsErr } = await supabase
      .from("app_settings")
      .select("admin_whatsapp_number")
      .eq("id", 1)
      .maybeSingle();

    if (settingsErr) throw new Error("Failed to load app_settings: " + settingsErr.message);

    const adminPhone = (settings as { admin_whatsapp_number?: string } | null)?.admin_whatsapp_number;
    if (!adminPhone) {
      return new Response(
        JSON.stringify({ ok: false, reason: "admin_whatsapp_number not configured in app_settings" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminChatId = `${adminPhone.replace(/\D/g, "")}@c.us`;

    const today = getDubaiDateStr(0);
    const inThreeDays = getDubaiDateStr(3);

    const { data: clients, error: clientsErr } = await supabase
      .from("portfolio_clients")
      .select("id, first_name, last_name, retainer_amount, next_payment_date")
      .eq("is_retainer", true)
      .not("next_payment_date", "is", null);

    if (clientsErr) throw new Error("Failed to load clients: " + clientsErr.message);
    if (!clients?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: "No retainer clients found", reminded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matched = clients.filter(c => {
      const pd: string = c.next_payment_date;
      return pd === today || pd === inThreeDays;
    });

    const results: Array<{ client: string; trigger: string; ok: boolean; error?: string }> = [];

    for (const client of matched) {
      const pd: string = client.next_payment_date;
      const isToday = pd === today;
      const clientName = `${client.first_name} ${client.last_name}`.trim();
      const amount = client.retainer_amount ?? "—";
      const formattedDate = formatDateRu(pd);

      const urgencyLine = isToday
        ? "🚨 *ПЛАТЁЖ СЕГОДНЯ!*"
        : "⏰ *Платёж через 3 дня*";

      const message = [
        "💰 *Финансовый контроль: Ожидается оплата!*",
        "",
        urgencyLine,
        "",
        `👤 *Клиент:* ${clientName}`,
        `💵 *Сумма:* ${amount}`,
        `📅 *Дата:* ${formattedDate}`,
        "",
        "Пора выставить инвойс на следующий месяц!",
      ].join("\n");

      const sendResult = await sendWhatsApp(
        GREEN_API_URL,
        GREEN_API_ID,
        GREEN_API_TOKEN,
        adminChatId,
        message
      );

      results.push({
        client: clientName,
        trigger: isToday ? "today" : "3_days",
        ok: sendResult.ok,
        error: sendResult.error,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        today,
        inThreeDays,
        checked: clients.length,
        matched: matched.length,
        reminded: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
