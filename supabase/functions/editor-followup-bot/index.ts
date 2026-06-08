import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendWhatsApp(
  greenApiUrl: string,
  greenApiId: string,
  greenApiToken: string,
  phone: string,
  message: string
): Promise<boolean> {
  try {
    const chatId = `${phone.replace(/\D/g, "")}@c.us`;
    const endpoint = `${greenApiUrl}/waInstance${greenApiId}/sendMessage/${greenApiToken}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const GREEN_API_URL = Deno.env.get("GREEN_API_URL");
    const GREEN_API_ID = Deno.env.get("GREEN_API_ID");
    const GREEN_API_TOKEN = Deno.env.get("GREEN_API_TOKEN");
    const ADMIN_PHONE = Deno.env.get("ADMIN_PHONE");

    if (!GREEN_API_URL || !GREEN_API_ID || !GREEN_API_TOKEN) {
      throw new Error("GREEN_API secrets not configured");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const results = { unassigned: 0, burning: 0, overdue: 0 };

    // State A — Unassigned open tasks → notify ALL editors via WhatsApp
    const { data: unassignedTasks } = await supabase
      .from("video_units")
      .select("id, client_name, task_type, created_at")
      .is("editor_name", null)
      .in("editing_status", ["pending", "open", "unassigned", ""])
      .order("created_at");

    if (unassignedTasks?.length) {
      const { data: editors } = await supabase
        .from("editor_balances")
        .select("whatsapp_number")
        .not("whatsapp_number", "is", null)
        .neq("whatsapp_number", "");

      const editorPhones = (editors ?? [])
        .map((e: { whatsapp_number: string }) => e.whatsapp_number)
        .filter(Boolean);

      for (const task of unassignedTasks) {
        const clientName = task.client_name ?? "Без имени";
        const shortId = String(task.id).slice(0, 8);
        const message = `🔥 Доступна новая свободная задача!\nКлиент: ${clientName}\nID: ${shortId}\n\nУспей зайти на портал и забрать её в работу первым!\n👉 https://yallainfluencers.com/edit`;

        for (const phone of editorPhones) {
          await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, phone, message);
        }
        results.unassigned++;
      }
    }

    // State B — Burning deadline (< 3 hours, not yet notified_3h) → notify editor directly
    const { data: burningTasks } = await supabase
      .from("video_units")
      .select("id, client_name, task_type, editor_name, deadline")
      .not("editor_name", "is", null)
      .not("deadline", "is", null)
      .gt("deadline", now.toISOString())
      .lte("deadline", threeHoursFromNow.toISOString())
      .eq("notified_3h", false)
      .neq("editing_status", "done")
      .neq("editing_status", "completed");

    if (burningTasks?.length) {
      for (const task of burningTasks) {
        const editorName = task.editor_name ?? "";
        const label = task.task_type ? ` [${task.task_type}]` : "";
        const clientName = task.client_name ?? "Без имени";
        const deadlineStr = new Date(task.deadline).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

        const { data: editorRow } = await supabase
          .from("editor_balances")
          .select("whatsapp_number")
          .eq("editor_name", editorName)
          .maybeSingle();

        const phone = editorRow?.whatsapp_number;
        if (phone) {
          const message = `⏳ ${editorName}, дедлайн по задаче${label} скоро сгорит!\nКлиент: ${clientName}\nДедлайн: ${deadlineStr}\n\nПоднажми! Осталось меньше 3 часов!\n👉 https://yallainfluencers.com/edit`;
          await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, phone, message);
        }

        await supabase.from("video_units").update({ notified_3h: true }).eq("id", task.id);
        results.burning++;
      }
    }

    // State C — Overdue tasks (deadline passed, not done, not yet notified_overdue) → notify editor directly
    const { data: overdueTasks } = await supabase
      .from("video_units")
      .select("id, client_name, task_type, editor_name, deadline, penalty_amount")
      .not("editor_name", "is", null)
      .not("deadline", "is", null)
      .lt("deadline", now.toISOString())
      .eq("notified_overdue", false)
      .neq("editing_status", "done")
      .neq("editing_status", "completed");

    if (overdueTasks?.length) {
      for (const task of overdueTasks) {
        const editorName = task.editor_name ?? "";
        const label = task.task_type ? ` [${task.task_type}]` : "";
        const clientName = task.client_name ?? "Без имени";
        const penaltyLine = task.penalty_amount && Number(task.penalty_amount) > 0
          ? `\nШтраф: ${task.penalty_amount} AED`
          : "";

        const { data: editorRow } = await supabase
          .from("editor_balances")
          .select("whatsapp_number")
          .eq("editor_name", editorName)
          .maybeSingle();

        const phone = editorRow?.whatsapp_number;
        if (phone) {
          const message = `🚨 ${editorName}, задача${label} ПРОСРОЧЕНА!\nКлиент: ${clientName}${penaltyLine}\n\nСрочно сдавай работу! Каждый час штраф растет!\n👉 https://yallainfluencers.com/edit`;
          await sendWhatsApp(GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, phone, message);
        }

        await supabase.from("video_units").update({ notified_overdue: true }).eq("id", task.id);
        results.overdue++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        timestamp: now.toISOString(),
        sent: results,
        total: results.unassigned + results.burning + results.overdue,
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
