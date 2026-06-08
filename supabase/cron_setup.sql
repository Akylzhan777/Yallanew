-- =============================================================================
-- Iron Discipline Bot — pg_cron Auto-Scheduler Setup
-- =============================================================================
-- Запускает Edge Function "editor-automations" каждые 2 часа
-- с 09:00 до 23:00 по времени Алматы (UTC+5).
-- В UTC это соответствует 04:00 – 18:00 UTC.
--
-- ИНСТРУКЦИЯ:
--   1. Откройте Supabase Dashboard → SQL Editor
--   2. Вставьте весь этот файл и нажмите "Run"
-- =============================================================================

-- Шаг 1: Включить расширения (если ещё не включены)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Шаг 2: Удалить старое задание, если оно уже существует (безопасный сброс)
SELECT cron.unschedule('iron-discipline-bot')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'iron-discipline-bot'
);

-- Шаг 3: Создать расписание
-- Cron: "0 4,6,8,10,12,14,16,18 * * *"
--   → каждые 2 часа в 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00 UTC
--   → по Алматы (UTC+5): 09:00, 11:00, 13:00, 15:00, 17:00, 19:00, 21:00, 23:00
SELECT cron.schedule(
  'iron-discipline-bot',
  '0 4,6,8,10,12,14,16,18 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/editor-automations',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Ynh0ZGNvbW5tc3dxcndvcnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTk1MDYsImV4cCI6MjA4NzU3NTUwNn0.-_6GJy1Tjt601wTJIZf6SttyIG21LQf1zpcT41jrf4s'
    ),
    body    := '{"action":"auto_hourly_check"}'::jsonb
  );
  $$
);

-- Шаг 4: Проверить, что задание создано
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'iron-discipline-bot';

-- =============================================================================
-- Чтобы ОТКЛЮЧИТЬ бота временно (не удалять):
--   UPDATE cron.job SET active = false WHERE jobname = 'iron-discipline-bot';
--
-- Чтобы ВКЛЮЧИТЬ снова:
--   UPDATE cron.job SET active = true WHERE jobname = 'iron-discipline-bot';
--
-- Чтобы УДАЛИТЬ полностью:
--   SELECT cron.unschedule('iron-discipline-bot');
-- =============================================================================
