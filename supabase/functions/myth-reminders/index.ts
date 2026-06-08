import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getDubaiParts(): { hour: number; weekday: number; dateStr: string } {
  const now = new Date();
  const dubaiOffsetMin = 4 * 60;
  const dubaiMs = now.getTime() + (dubaiOffsetMin - now.getTimezoneOffset()) * 60000;
  const d = new Date(dubaiMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return {
    hour: d.getUTCHours(),
    weekday: d.getUTCDay(),
    dateStr: `${y}-${m}-${day}`,
  };
}

function sanitizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

async function sendWhatsApp(
  apiUrl: string,
  id: string,
  token: string,
  chatId: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const endpoint = `${apiUrl}/waInstance${id}/sendMessage/${token}`;
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GREEN_API_URL = Deno.env.get("GREEN_API_URL");
    const GREEN_API_ID = Deno.env.get("GREEN_API_ID");
    const GREEN_API_TOKEN = Deno.env.get("GREEN_API_TOKEN");

    if (!GREEN_API_URL || !GREEN_API_ID || !GREEN_API_TOKEN) {
      return new Response(
        JSON.stringify({ ok: false, reason: "GREEN_API secrets not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { hour, weekday, dateStr } = getDubaiParts();
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const force = body?.force === true;
    const forcedSlot = body?.slot as "day" | "evening" | undefined;
    const forcedPhone = typeof body?.phone === "string" ? sanitizePhone(body.phone) : "";
    const forcedMessage = typeof body?.message === "string" ? body.message : "";

    const isTargetDay = weekday === 4 || weekday === 6;

    if (!force && !isTargetDay) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "not a target day", weekday, hour, dateStr }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const slot: "day" | "evening" | null = forcedSlot
      ?? (hour === 12 ? "day" : hour === 23 ? "evening" : null);

    if (!force && !slot) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "not a target hour", hour, weekday, dateStr }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (force && forcedPhone && forcedMessage) {
      const chatId = `${forcedPhone}@c.us`;
      const res = await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, chatId, forcedMessage);
      return new Response(
        JSON.stringify({ ok: res.ok, test: true, error: res.error ?? null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: settings, error: settingsError } = await supabase
      .from("myth_operator_reminders")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (settingsError) throw new Error(settingsError.message);
    if (!settings) {
      return new Response(
        JSON.stringify({ ok: false, reason: "No settings row configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!settings.enabled) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const phone = sanitizePhone(settings.operator_phone || "");
    if (!phone) {
      return new Response(
        JSON.stringify({ ok: false, reason: "operator_phone not set" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const template = slot === "day" ? (settings.day_template || "") : (settings.evening_template || "");
    if (!template.trim()) {
      return new Response(
        JSON.stringify({ ok: false, reason: `${slot} template empty` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dedupeCol = slot === "day" ? "last_day_sent_date" : "last_evening_sent_date";
    const lastSent: string | null = settings[dedupeCol] ?? null;
    if (!force && lastSent === dateStr) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "already sent today", slot, dateStr }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const chatId = `${phone}@c.us`;
    const result = await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, chatId, template);

    if (result.ok) {
      await supabase
        .from("myth_operator_reminders")
        .update({ [dedupeCol]: dateStr, updated_at: new Date().toISOString() })
        .eq("id", settings.id);
    }

    return new Response(
      JSON.stringify({ ok: result.ok, slot, dateStr, error: result.error ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
