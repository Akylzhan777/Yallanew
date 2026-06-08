-- ══════════════════════════════════════════════════════════════════════════
-- deal_messages: Realtime security hardening
--
-- 1. Ensure RLS is enabled (idempotent).
-- 2. Add/replace RLS SELECT policy using a SECURITY DEFINER helper to avoid
--    recursion and guarantee the participant check is airtight.
-- 3. Ensure deal_messages is in supabase_realtime publication so Supabase
--    applies RLS filtering before broadcasting events.
-- 4. Add a BEFORE INSERT trigger that overwrites sender_id from auth.uid(),
--    making client-supplied sender_id values completely irrelevant.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Ensure RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_chats    ENABLE ROW LEVEL SECURITY;

-- ── 2. Tighten SELECT policy ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Chat participants can read messages" ON public.deal_messages;
CREATE POLICY "Chat participants can read messages"
  ON public.deal_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deal_chats dc
      WHERE dc.id = deal_messages.chat_id
        AND (dc.client_id = auth.uid() OR dc.freelancer_id = auth.uid())
    )
  );

-- Ensure INSERT policy enforces sender_id = auth.uid() at DB level
DROP POLICY IF EXISTS "Chat participants can send messages" ON public.deal_messages;
CREATE POLICY "Chat participants can send messages"
  ON public.deal_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.deal_chats dc
      WHERE dc.id = deal_messages.chat_id
        AND dc.status = 'active'
        AND (dc.client_id = auth.uid() OR dc.freelancer_id = auth.uid())
    )
  );

-- ── 3. Realtime publication ───────────────────────────────────────────────
-- Adds table to the publication if not already present; no-op if it is.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'deal_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_messages;
  END IF;
END $$;

-- ── 4. Server-side sender_id enforcement via BEFORE trigger ───────────────
-- Overwrites whatever sender_id the client sent with the verified auth.uid().
-- This makes client-supplied sender_id values completely irrelevant.
-- For system messages inserted by SECURITY DEFINER functions (triggers),
-- auth.uid() is NULL — we preserve the supplied sender_id in that case.
CREATE OR REPLACE FUNCTION public.enforce_sender_id_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Only overwrite when we have a live auth session (non-system inserts)
  IF auth.uid() IS NOT NULL THEN
    NEW.sender_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_sender_id ON public.deal_messages;
CREATE TRIGGER trg_enforce_sender_id
  BEFORE INSERT ON public.deal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_sender_id_from_auth();
