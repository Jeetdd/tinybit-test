-- ================================================================
-- MODULE 53: Guardian read access to health_logs & wellness_logs
--
-- Allows connected guardians to SELECT (read) their elder's
-- health_logs and wellness_logs rows in real time.
-- Elders still have full CRUD on their own rows.
-- ================================================================

-- ── health_logs ──────────────────────────────────────────────────────────────

-- Make sure the table has RLS enabled (created inline in health-log.tsx)
ALTER TABLE IF EXISTS public.health_logs ENABLE ROW LEVEL SECURITY;

-- Drop & recreate to avoid duplicates
DROP POLICY IF EXISTS "users own health logs"               ON public.health_logs;
DROP POLICY IF EXISTS "guardian read elder health logs"     ON public.health_logs;
DROP POLICY IF EXISTS "health_logs_owner_all"               ON public.health_logs;
DROP POLICY IF EXISTS "health_logs_guardian_select"         ON public.health_logs;

-- Elder: full access to their own rows
CREATE POLICY "health_logs_owner_all"
  ON public.health_logs
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Guardian: SELECT rows of any connected elder
CREATE POLICY "health_logs_guardian_select"
  ON public.health_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links
      WHERE guardian_id = auth.uid()
        AND elder_id     = health_logs.user_id
        AND status       = 'connected'
    )
  );

-- ── wellness_logs ─────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.wellness_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own logs"                       ON public.wellness_logs;
DROP POLICY IF EXISTS "guardian read elder wellness logs"    ON public.wellness_logs;
DROP POLICY IF EXISTS "wellness_logs_owner_all"              ON public.wellness_logs;
DROP POLICY IF EXISTS "wellness_logs_guardian_select"        ON public.wellness_logs;

CREATE POLICY "wellness_logs_owner_all"
  ON public.wellness_logs
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wellness_logs_guardian_select"
  ON public.wellness_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links
      WHERE guardian_id = auth.uid()
        AND elder_id     = wellness_logs.user_id
        AND status       = 'connected'
    )
  );

-- ── Add both tables to realtime publication ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'health_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.health_logs;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'wellness_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wellness_logs;
  END IF;
END $$;
