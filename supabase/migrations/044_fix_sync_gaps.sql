-- ================================================================
-- MODULE 44: Fix guardian sync gaps
-- 1. Fix check-in shares RLS: 'accepted' → 'connected'
-- 2. Enable realtime for guardian_check_in_shares
-- Paste and run in Supabase SQL Editor.
-- ================================================================

-- ── 1. Fix the RLS policy that blocked guardians from reading check-in data ──
--      The app uses status='connected'; the old policy checked 'accepted'.
DROP POLICY IF EXISTS "shares_guardian_read" ON public.guardian_check_in_shares;
CREATE POLICY "shares_guardian_read"
  ON public.guardian_check_in_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links
      WHERE guardian_id = auth.uid()
        AND elder_id    = guardian_check_in_shares.elder_id
        AND status      = 'connected'
    )
  );

-- ── 2. Enable Supabase Realtime for guardian_check_in_shares ─────────────────
ALTER TABLE public.guardian_check_in_shares REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'guardian_check_in_shares'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guardian_check_in_shares;
  END IF;
END $$;

-- ── 3. Also fix check-in shares access for guardians via medicine/notes reads──
--      While we're here, confirm medicines and medicine_logs are in realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'medicines'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.medicines;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'medicine_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_logs;
  END IF;
END $$;
