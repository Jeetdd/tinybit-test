-- ================================================================
-- MODULE 45: Ensure medicine_logs RLS policies are applied
-- Run this in Supabase SQL Editor if medicine log inserts fail
-- with "violates row-level security policy".
-- ================================================================

-- Ensure RLS is on
ALTER TABLE public.medicine_logs ENABLE ROW LEVEL SECURITY;

-- Elder can read their own logs
DROP POLICY IF EXISTS "medicine_logs_select_own" ON public.medicine_logs;
CREATE POLICY "medicine_logs_select_own"
  ON public.medicine_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Elder can insert their own logs
DROP POLICY IF EXISTS "medicine_logs_insert_own" ON public.medicine_logs;
CREATE POLICY "medicine_logs_insert_own"
  ON public.medicine_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Elder can delete their own logs (for untoggling)
DROP POLICY IF EXISTS "medicine_logs_delete_own" ON public.medicine_logs;
CREATE POLICY "medicine_logs_delete_own"
  ON public.medicine_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Guardian can read logs for their connected elders
DROP POLICY IF EXISTS "guardian_read_elder_medicine_logs" ON public.medicine_logs;
CREATE POLICY "guardian_read_elder_medicine_logs"
  ON public.medicine_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = user_id
        AND g.status      = 'connected'
    )
  );

-- Also ensure medicine_logs is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'medicine_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_logs;
  END IF;
END $$;