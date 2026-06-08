import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const INTERVAL_MS: Record<string, number> = {
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

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

function formatDubaiDatetime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shouldSendReminder(
  repeatInterval: string,
  lastRemindedAt: string | null,
  dueAt: string
): boolean {
  const now = Date.now();
  const due = new Date(dueAt).getTime();

  if (due > now) return false;

  if (repeatInterval === "none") {
    return lastRemindedAt === null;
  }

  const intervalMs = INTERVAL_MS[repeatInterval];
  if (!intervalMs) return false;

  if (lastRemindedAt === null) return true;

  return now >= new Date(lastRemindedAt).getTime() + intervalMs;
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: settings } = await supabaseClient
      .from("app_settings")
      .select("admin_whatsapp_number")
      .eq("id", 1)
      .maybeSingle();

    const adminDefaultPhone = (settings as { admin_whatsapp_number?: string } | null)?.admin_whatsapp_number ?? null;

    const { data: tasks, error: tasksErr } = await supabaseClient
      .from("admin_tasks")
      .select("id, title, due_datetime, repeat_interval, last_reminded_at, whatsapp_number")
      .eq("is_completed", false)
      .lte("due_datetime", new Date().toISOString());

    if (tasksErr) throw new Error("Failed to load admin_tasks: " + tasksErr.message);

    if (!tasks?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: "No overdue tasks", reminded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ task: string; action: string; ok: boolean; error?: string }> = [];

    for (const task of tasks) {
      const due = shouldSendReminder(task.repeat_interval, task.last_reminded_at, task.due_datetime);

      if (!due) {
        results.push({ task: task.title, action: "skipped", ok: true });
        continue;
      }

      const recipientPhone = (task.whatsapp_number ?? adminDefaultPhone ?? "").replace(/\D/g, "");
      if (!recipientPhone) {
        results.push({ task: task.title, action: "no_phone", ok: false, error: "No WhatsApp number configured" });
        continue;
      }

      const chatId = `${recipientPhone}@c.us`;
      const formattedTime = formatDubaiDatetime(task.due_datetime);

      const message = [
        "🔔 *Напоминание из Админки!*",
        "",
        `📌 *Задача:* ${task.title}`,
        `⏰ *Время:* ${formattedTime}`,
        "",
        "Не забудь сделать, бро!",
      ].join("\n");

      const sendResult = await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, chatId, message);

      if (sendResult.ok) {
        const now = new Date().toISOString();
        await supabaseClient
          .from("admin_tasks")
          .update({ last_reminded_at: now, is_reminded: true })
          .eq("id", task.id);
      }

      results.push({ task: task.title, action: "sent", ok: sendResult.ok, error: sendResult.error });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        checked: tasks.length,
        reminded: results.filter(r => r.action === "sent" && r.ok).length,
        skipped: results.filter(r => r.action === "skipped").length,
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
