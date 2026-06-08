/*
  # Myth auto-reply: tasks & music/references

  1. Changes to `telegram_settings`
    - Add `myth_tasks_reply` (text, default ''): bot reply when user taps "📋 Задачи на сегодня"
    - Add `myth_music_reply` (text, default ''): bot reply when user taps "🎵 Музыка/Референсы"

  2. Notes
    - Non-destructive; both columns nullable-safe with default empty string
    - No RLS changes required
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='telegram_settings' AND column_name='myth_tasks_reply') THEN
    ALTER TABLE telegram_settings ADD COLUMN myth_tasks_reply text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='telegram_settings' AND column_name='myth_music_reply') THEN
    ALTER TABLE telegram_settings ADD COLUMN myth_music_reply text DEFAULT '';
  END IF;
END $$;
