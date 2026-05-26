-- ================================================================
-- MODULE 46: Health Vault — guardian access + mime_type + update policy
-- Run in Supabase SQL Editor.
-- ================================================================

-- 1. Add mime_type column (frontend already uses it)
ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- 2. Elder can UPDATE (edit title / category)
DROP POLICY IF EXISTS "health_records_update_own" ON public.health_records;
CREATE POLICY "health_records_update_own"
  ON public.health_records FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Guardian SELECT: read connected elder's records
DROP POLICY IF EXISTS "guardian_read_elder_health_records" ON public.health_records;
CREATE POLICY "guardian_read_elder_health_records"
  ON public.health_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = user_id
        AND g.status      = 'connected'
    )
  );

-- 4. Guardian INSERT: upload records on behalf of a connected elder
DROP POLICY IF EXISTS "guardian_insert_elder_health_record" ON public.health_records;
CREATE POLICY "guardian_insert_elder_health_record"
  ON public.health_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = health_records.user_id
        AND g.status      = 'connected'
    )
  );

-- 5. Guardian UPDATE: edit elder's records
DROP POLICY IF EXISTS "guardian_update_elder_health_record" ON public.health_records;
CREATE POLICY "guardian_update_elder_health_record"
  ON public.health_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = user_id
        AND g.status      = 'connected'
    )
  );

-- 6. Guardian DELETE: remove elder's records
DROP POLICY IF EXISTS "guardian_delete_elder_health_record" ON public.health_records;
CREATE POLICY "guardian_delete_elder_health_record"
  ON public.health_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = user_id
        AND g.status      = 'connected'
    )
  );

-- 7. Ensure health_records is in realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'health_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.health_records;
  END IF;
END $$;