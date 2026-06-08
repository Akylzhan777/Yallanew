import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BroadcastRequest {
  body: string;
  segment: string;
}

interface CreatorRow {
  user_id: string;
  display_name: string;
  whatsapp_number: string;
  preferred_language: string | null;
  creator_type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth token" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userResp } = await userClient.auth.getUser();
    if (!userResp.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userResp.user.id)
      .maybeSingle();
    if (!profile || profile.role !== "admin") {
      return json({ error: "Admin access required" }, 403);
    }

    const { body, segment }: BroadcastRequest = await req.json();
    if (!body?.trim()) return json({ error: "Body is required" }, 400);

    // Read Green API credentials from app_settings
    const { data: appSettings } = await admin
      .from("app_settings")
      .select("green_api_base_url, green_api_id_instance, green_api_token_instance")
      .eq("id", 1)
      .maybeSingle();

    const baseUrl = (appSettings?.green_api_base_url?.trim() || Deno.env.get("GREEN_API_BASE_URL") || "https://api.green-api.com").replace(/\/+$/, "");
    const idInstance = appSettings?.green_api_id_instance?.trim() || Deno.env.get("GREEN_API_ID_INSTANCE") || "";
    const apiToken = appSettings?.green_api_token_instance?.trim() || Deno.env.get("GREEN_API_API_TOKEN_INSTANCE") || "";

    if (!idInstance || !apiToken) {
      return json({ error: "Green API credentials not configured. Go to Admin → WhatsApp Marketing → Green API tab." }, 500);
    }

    console.log("[whatsapp-broadcast] base_url:", baseUrl, "instance:", idInstance, "token_set:", !!apiToken);

    let query = admin
      .from("creator_profiles")
      .select("user_id, display_name, whatsapp_number, preferred_language, creator_type")
      .not("whatsapp_number", "is", null);
    if (segment !== "all") {
      query = query.eq("creator_type", segment);
    }
    const { data: recipients, error: recErr } = await query;
    if (recErr) return json({ error: recErr.message }, 500);

    const targets = (recipients ?? []) as CreatorRow[];
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const r of targets) {
      const number = r.whatsapp_number?.replace(/\D/g, "") ?? "";
      if (!/^\d{8,15}$/.test(number)) { failed++; continue; }

      const message = body.replace(/\{\{name\}\}/g, r.display_name || "");
      const greenUrl = `${baseUrl}/waInstance${idInstance}/sendMessage/${apiToken}`;

      try {
        const res = await fetch(greenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: `${number}@c.us`, message }),
        });
        if (res.ok) sent++;
        else { failed++; errors.push(`${number}: ${res.status}`); }
      } catch (e) {
        failed++;
        errors.push(`${number}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await admin.from("whatsapp_broadcasts").insert({
      body,
      segment,
      sent_count: sent,
      failed_count: failed,
      created_by: userResp.user.id,
    });

    return json({ ok: true, sent_count: sent, failed_count: failed, errors: errors.slice(0, 10) });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
