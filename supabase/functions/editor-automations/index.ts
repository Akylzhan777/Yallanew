import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendWhatsApp(
  greenApiUrl: string,
  greenApiId: string,
  greenApiToken: string,
  phone: string,
  message: string
): Promise<{ ok: boolean; reason?: string }> {
  const rawPhone = String(phone).replace(/\D/g, "");
  if (!rawPhone) return { ok: false, reason: "Empty phone number" };
  const chatId = `${rawPhone}@c.us`;
  const endpoint = `${greenApiUrl}/waInstance${greenApiId}/sendMessage/${greenApiToken}`;
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return { ok: false, reason: `Green API HTTP ${resp.status}: ${detail}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `Network error: ${String(e)}` };
  }
}

const PENDING_TEMPLATES = [
  `🚨 СВОБОДНЫЙ ЗАКАЗ ВИСИТ! Кто первый заберет, того и деньги. Заходим на портал живо!`,
  `💸 Парни, деньги простаивают! В «Свободных заказах» пополнение. Заходи, бери в работу, руби кэш!`,
  `🏆 Конкурент не спит! Пока ты думаешь, другие уже монтируют и зарабатывают. Залетай на портал, там есть свободные задачи.`,
  `⚡ Сигнал тревоги! Свободные задачи висят и ждут. Первый, кто заберёт — тот и в плюсе. Вперёд!`,
  `🎯 Раздача заказов уже идёт! Заходи на портал, пока конкуренты не разобрали всё до тебя.`,
];

async function runDeadlineCheck(
  db: ReturnType<typeof createClient>,
  hasGreenApi: boolean,
  greenApiUrl: string | undefined,
  greenApiId: string | undefined,
  greenApiToken: string | undefined
): Promise<{ processed: number; results: Array<{ id: string; action: string; sent: boolean; reason?: string }> }> {
  const { data: tasks, error: tasksErr } = await db
    .from("video_units")
    .select("id, editor_name, claimed_at, notified_12h, notified_3h, notified_overdue")
    .eq("editing_status", "in_progress")
    .not("claimed_at", "is", null);

  if (tasksErr) return { processed: 0, results: [] };

  const results: Array<{ id: string; action: string; sent: boolean; reason?: string }> = [];

  for (const task of tasks ?? []) {
    const claimedAt = new Date(task.claimed_at).getTime();
    const deadlineAt = claimedAt + 48 * 60 * 60 * 1000;
    const msLeft = deadlineAt - Date.now();
    const hoursLeft = msLeft / (60 * 60 * 1000);

    if (!hasGreenApi) {
      results.push({ id: task.id, action: "skipped_no_api", sent: false, reason: "GREEN_API not configured" });
      continue;
    }

    const { data: editorRow } = await db
      .from("editor_balances")
      .select("whatsapp_number")
      .eq("editor_name", task.editor_name)
      .maybeSingle();

    const phone = editorRow?.whatsapp_number;

    if (hoursLeft < 0 && !task.notified_overdue) {
      const msg =
        `🚨 ДЕДЛАЙН ПРОСРОЧЕН!\n\nТвоя задача уже просрочена.\n` +
        `Ты теряешь бонус! Срочно сдай работу или объяснись. Каждый час — минус деньги!`;
      const sendResult = phone
        ? await sendWhatsApp(greenApiUrl!, greenApiId!, greenApiToken!, phone, msg)
        : { ok: false, reason: "No phone" };
      await db.from("video_units").update({ notified_overdue: true }).eq("id", task.id);
      results.push({ id: task.id, action: "overdue", sent: sendResult.ok, reason: sendResult.reason });
    } else if (hoursLeft < 3 && hoursLeft >= 0 && !task.notified_3h) {
      const hrs = Math.max(0, Math.floor(hoursLeft));
      const mins = Math.round((hoursLeft - hrs) * 60);
      const msg =
        `⚠️ ОСТАЛОСЬ ${hrs}ч ${mins}м!\n\nДо дедлайна критически мало времени. ` +
        `Если не успеешь — получишь штраф. Брось всё и монтируй!`;
      const sendResult = phone
        ? await sendWhatsApp(greenApiUrl!, greenApiId!, greenApiToken!, phone, msg)
        : { ok: false, reason: "No phone" };
      await db.from("video_units").update({ notified_3h: true }).eq("id", task.id);
      results.push({ id: task.id, action: "warning_3h", sent: sendResult.ok, reason: sendResult.reason });
    } else if (hoursLeft < 12 && hoursLeft >= 0 && !task.notified_12h) {
      const hrs = Math.floor(hoursLeft);
      const msg =
        `🕐 12 ЧАСОВ ДО ДЕДЛАЙНА!\n\nОсталось ~${hrs} ч. до сдачи задачи. ` +
        `Не затягивай — подними приоритет и дожми до конца. Деньги ждут!`;
      const sendResult = phone
        ? await sendWhatsApp(greenApiUrl!, greenApiId!, greenApiToken!, phone, msg)
        : { ok: false, reason: "No phone" };
      await db.from("video_units").update({ notified_12h: true }).eq("id", task.id);
      results.push({ id: task.id, action: "warning_12h", sent: sendResult.ok, reason: sendResult.reason });
    }
  }

  return { processed: results.length, results };
}

function calcPenaltyBracket(hoursOverdue: number): number {
  if (hoursOverdue > 72) return 20000;
  if (hoursOverdue > 48) return 10000;
  if (hoursOverdue > 24) return 5000;
  if (hoursOverdue > 0)  return 500;
  return 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const GREEN_API_URL = Deno.env.get("GREEN_API_URL");
    const GREEN_API_ID = Deno.env.get("GREEN_API_ID");
    const GREEN_API_TOKEN = Deno.env.get("GREEN_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ ok: false, reason: "Supabase env not configured" });
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: { action?: string; taskTitle?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, reason: "Invalid JSON body" });
    }

    const { action, taskTitle } = body;

    if (!action) {
      return jsonResponse({ ok: false, reason: "Missing action field" });
    }

    if (action === "add_client_id_column") {
      const { error: checkErr } = await db.from("telegram_groups").select("client_id").limit(1);
      if (!checkErr) {
        return jsonResponse({ ok: true, msg: "client_id column already exists" });
      }
      const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? "";
      if (!dbUrl) {
        const pgMetaUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace("https://", "https://") + "/pg/query";
        const r = await fetch(pgMetaUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") },
          body: JSON.stringify({ query: "ALTER TABLE telegram_groups ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;" }),
        });
        return jsonResponse({ ok: r.ok, status: r.status, body: await r.text() });
      }
      return jsonResponse({ ok: false, msg: "no DB_URL available, use Supabase SQL editor" });
    }

    const hasGreenApi = !!(GREEN_API_URL && GREEN_API_ID && GREEN_API_TOKEN);

    // ---------------------------------------------------------------
    // ACTION: dictator_cron — 3-phase automation
    // Phase 1: Siren (pending tasks broadcast)
    // Phase 2: Woodpecker (daily in_progress reminders)
    // Phase 3: Blood Counter (progressive penalties for overdue)
    // ---------------------------------------------------------------
    if (action === "dictator_cron") {
      const now = new Date();
      const sirenResult: Record<string, unknown> = { skipped: true };
      const woodpeckerResult: Array<{ id: string; sent: boolean }> = [];
      const penaltyResult: Array<{ id: string; penalty: number; changed: boolean; notified: boolean }> = [];

      // ---- Phase 1: The Siren ----
      const { count: pendingCount } = await db
        .from("video_units")
        .select("id", { count: "exact", head: true })
        .eq("editing_status", "pending");

      if ((pendingCount ?? 0) > 0 && hasGreenApi) {
        const { data: allEditors } = await db
          .from("editor_balances")
          .select("whatsapp_number")
          .not("whatsapp_number", "is", null);

        const msg = PENDING_TEMPLATES[Math.floor(Math.random() * PENDING_TEMPLATES.length)];
        let sirenSent = 0;
        for (const ed of allEditors ?? []) {
          if (ed.whatsapp_number) {
            const r = await sendWhatsApp(GREEN_API_URL!, GREEN_API_ID!, GREEN_API_TOKEN!, ed.whatsapp_number, msg);
            if (r.ok) sirenSent++;
          }
        }
        Object.assign(sirenResult, { skipped: false, sent: sirenSent, pendingCount, msg });
      } else if ((pendingCount ?? 0) === 0) {
        Object.assign(sirenResult, { skipped: true, reason: "No pending tasks" });
      } else {
        Object.assign(sirenResult, { skipped: true, reason: "GREEN_API not configured" });
      }

      // ---- Phase 2: The Woodpecker (in_progress, not yet overdue) ----
      const { data: inProgressTasks } = await db
        .from("video_units")
        .select("id, editor_name, claimed_at")
        .eq("editing_status", "in_progress")
        .not("claimed_at", "is", null)
        .not("editor_name", "is", null);

      for (const task of inProgressTasks ?? []) {
        const deadlineAt = new Date(task.claimed_at).getTime() + 48 * 60 * 60 * 1000;
        if (now.getTime() < deadlineAt && hasGreenApi) {
          const { data: editorRow } = await db
            .from("editor_balances")
            .select("whatsapp_number")
            .eq("editor_name", task.editor_name)
            .maybeSingle();

          if (editorRow?.whatsapp_number) {
            const msg =
              `⏳ Напоминание: у тебя в работе заказ. Не забудь про видео и обложку. Дедлайн тикает, делай красиво!`;
            const r = await sendWhatsApp(GREEN_API_URL!, GREEN_API_ID!, GREEN_API_TOKEN!, editorRow.whatsapp_number, msg);
            woodpeckerResult.push({ id: task.id, sent: r.ok });
          }
        }
      }

      // ---- Phase 3: The Blood Counter (overdue tasks — progressive penalties) ----
      const { data: overdueTasks } = await db
        .from("video_units")
        .select("id, editor_name, claimed_at, penalty_amount")
        .eq("editing_status", "in_progress")
        .not("claimed_at", "is", null)
        .not("editor_name", "is", null);

      for (const task of overdueTasks ?? []) {
        const deadlineAt = new Date(task.claimed_at).getTime() + 48 * 60 * 60 * 1000;
        const hoursOverdue = (now.getTime() - deadlineAt) / (60 * 60 * 1000);

        if (hoursOverdue <= 0) continue;

        const newPenalty = calcPenaltyBracket(hoursOverdue);
        const oldPenalty = task.penalty_amount ?? 0;
        const changed = newPenalty > oldPenalty;

        if (changed) {
          await db
            .from("video_units")
            .update({ penalty_amount: newPenalty })
            .eq("id", task.id);

          let notified = false;
          if (hasGreenApi) {
            const { data: editorRow } = await db
              .from("editor_balances")
              .select("whatsapp_number")
              .eq("editor_name", task.editor_name)
              .maybeSingle();

            if (editorRow?.whatsapp_number) {
              const msg =
                `❌ ШТРАФ! Ты просрочил дедлайн. С твоего баланса только что списано ${newPenalty.toLocaleString()} тенге. Сдавай работу сейчас, завтра штраф будет еще больше!`;
              const r = await sendWhatsApp(GREEN_API_URL!, GREEN_API_ID!, GREEN_API_TOKEN!, editorRow.whatsapp_number, msg);
              notified = r.ok;
            }
          }

          penaltyResult.push({ id: task.id, penalty: newPenalty, changed: true, notified });
        } else {
          penaltyResult.push({ id: task.id, penalty: oldPenalty, changed: false, notified: false });
        }
      }

      return jsonResponse({
        ok: true,
        siren: sirenResult,
        woodpecker: { processed: woodpeckerResult.length, results: woodpeckerResult },
        bloodCounter: { processed: penaltyResult.filter(p => p.changed).length, results: penaltyResult },
      });
    }

    // ---------------------------------------------------------------
    // ACTION: auto_hourly_check (called by pg_cron every 2h, 09-23 KZT)
    // ---------------------------------------------------------------
    if (action === "auto_hourly_check") {
      const deadlineResult = await runDeadlineCheck(db, hasGreenApi, GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN);

      const { count: pendingCount, error: countErr } = await db
        .from("video_units")
        .select("id", { count: "exact", head: true })
        .eq("editing_status", "pending");

      if (countErr) {
        return jsonResponse({ ok: true, deadlines: deadlineResult, broadcast: { skipped: true, reason: countErr.message } });
      }

      const pending = pendingCount ?? 0;
      let broadcastResult: Record<string, unknown> = { skipped: true, reason: "No pending tasks" };

      if (pending > 0 && hasGreenApi) {
        const { data: editors } = await db
          .from("editor_balances")
          .select("whatsapp_number")
          .not("whatsapp_number", "is", null);

        const templateIndex = Math.floor(Math.random() * PENDING_TEMPLATES.length);
        const msg = PENDING_TEMPLATES[templateIndex];

        let sent = 0;
        for (const ed of editors ?? []) {
          if (ed.whatsapp_number) {
            const r = await sendWhatsApp(GREEN_API_URL!, GREEN_API_ID!, GREEN_API_TOKEN!, ed.whatsapp_number, msg);
            if (r.ok) sent++;
          }
        }

        broadcastResult = { sent, total: (editors ?? []).length, pendingCount: pending, templateIndex };
      } else if (pending > 0 && !hasGreenApi) {
        broadcastResult = { skipped: true, reason: "GREEN_API not configured" };
      }

      return jsonResponse({ ok: true, deadlines: deadlineResult, broadcast: broadcastResult });
    }

    // ---------------------------------------------------------------
    // ACTION: check_deadlines
    // ---------------------------------------------------------------
    if (action === "check_deadlines") {
      const result = await runDeadlineCheck(db, hasGreenApi, GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN);
      return jsonResponse({ ok: true, ...result });
    }

    // ---------------------------------------------------------------
    // ACTION: broadcast_unassigned
    // ---------------------------------------------------------------
    if (action === "broadcast_unassigned") {
      const { count, error: countErr } = await db
        .from("video_units")
        .select("id", { count: "exact", head: true })
        .eq("editing_status", "pending");

      if (countErr) return jsonResponse({ ok: false, reason: countErr.message });

      const pendingCount = count ?? 0;
      if (pendingCount === 0) {
        return jsonResponse({ ok: true, sent: 0, pendingCount: 0, reason: "No pending tasks right now" });
      }

      if (!hasGreenApi) {
        return jsonResponse({ ok: false, reason: "GREEN_API not configured" });
      }

      const { data: editors, error: editorsErr } = await db
        .from("editor_balances")
        .select("whatsapp_number, editor_name")
        .not("whatsapp_number", "is", null);

      if (editorsErr) return jsonResponse({ ok: false, reason: editorsErr.message });

      const msg =
        `🚨 СВОБОДНЫЙ ЗАКАЗ ВИСИТ! Кто первый заберет, того и деньги. Заходим на портал живо!\n\n` +
        `Свободных задач: ${pendingCount}`;

      let sent = 0;
      for (const ed of editors ?? []) {
        if (ed.whatsapp_number) {
          const r = await sendWhatsApp(GREEN_API_URL!, GREEN_API_ID!, GREEN_API_TOKEN!, ed.whatsapp_number, msg);
          if (r.ok) sent++;
        }
      }

      return jsonResponse({ ok: true, sent, total: (editors ?? []).length, pendingCount });
    }

    // ---------------------------------------------------------------
    // ACTION: broadcast_leaderboard
    // ---------------------------------------------------------------
    if (action === "broadcast_leaderboard") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: completedTasks, error: taskErr } = await db
        .from("video_units")
        .select("editor_name")
        .eq("editing_status", "done")
        .gte("claimed_at", monthStart)
        .not("editor_name", "is", null);

      if (taskErr) return jsonResponse({ ok: false, reason: taskErr.message });

      const counts: Record<string, number> = {};
      for (const t of completedTasks ?? []) {
        if (t.editor_name) counts[t.editor_name] = (counts[t.editor_name] ?? 0) + 1;
      }

      if (Object.keys(counts).length === 0) {
        return jsonResponse({ ok: true, sent: 0, reason: "Нет завершенных задач для рейтинга в этом месяце" });
      }

      const leaderName = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
      const taskCount = counts[leaderName];

      if (!hasGreenApi) {
        return jsonResponse({ ok: false, reason: "GREEN_API not configured" });
      }

      const { data: editors, error: editorsErr } = await db
        .from("editor_balances")
        .select("whatsapp_number, editor_name")
        .not("whatsapp_number", "is", null);

      if (editorsErr) return jsonResponse({ ok: false, reason: editorsErr.message });

      const msg =
        `🏆 ГОНКА ЗА $1000!\n\n` +
        `Текущий лидер этого месяца: ${leaderName} (${taskCount} видео).\n` +
        `Он забирает ваши деньги! Заходите на портал и догоняйте — месяц ещё не закончен!`;

      let sent = 0;
      for (const ed of editors ?? []) {
        if (ed.whatsapp_number) {
          const r = await sendWhatsApp(GREEN_API_URL!, GREEN_API_ID!, GREEN_API_TOKEN!, ed.whatsapp_number, msg);
          if (r.ok) sent++;
        }
      }

      return jsonResponse({ ok: true, sent, leaderName, taskCount });
    }

    // ---------------------------------------------------------------
    // ACTION: broadcast_new_task
    // ---------------------------------------------------------------
    if (action === "broadcast_new_task") {
      if (!hasGreenApi) {
        return jsonResponse({ ok: false, reason: "GREEN_API not configured" });
      }

      const title = taskTitle ? String(taskTitle) : "Новая задача";

      const { data: editors, error: editorsErr } = await db
        .from("editor_balances")
        .select("whatsapp_number, editor_name")
        .not("whatsapp_number", "is", null);

      if (editorsErr) return jsonResponse({ ok: false, reason: editorsErr.message });

      const msg =
        `🔥 В систему загружен новый жирный заказ! Залетайте и забирайте, пока не забрали другие!\n\nКлиент: ${title}`;

      let sent = 0;
      for (const ed of editors ?? []) {
        if (ed.whatsapp_number) {
          const r = await sendWhatsApp(GREEN_API_URL!, GREEN_API_ID!, GREEN_API_TOKEN!, ed.whatsapp_number, msg);
          if (r.ok) sent++;
        }
      }

      return jsonResponse({ ok: true, sent, total: (editors ?? []).length });
    }

    return jsonResponse({ ok: false, reason: `Unknown action: ${action}` });
  } catch (err) {
    return jsonResponse({ ok: false, reason: `Unexpected error: ${String(err)}` });
  }
});
