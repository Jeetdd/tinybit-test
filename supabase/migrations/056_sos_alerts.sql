-- ================================================================
-- MODULE 56: SOS Alerts
-- Logs every time the elder triggers the SOS button.
-- Guardians are notified via the notifications table.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  status       TEXT        NOT NULL DEFAULT 'active'  -- 'active' | 'resolved'
);

CREATE INDEX IF NOT EXISTS sos_alerts_user_idx
  ON public.sos_alerts(user_id, triggered_at DESC);

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sos_select_own"         ON public.sos_alerts;
DROP POLICY IF EXISTS "sos_insert_own"         ON public.sos_alerts;
DROP POLICY IF EXISTS "sos_update_own"         ON public.sos_alerts;
DROP POLICY IF EXISTS "sos_guardian_select"    ON public.sos_alerts;

-- Elder reads their own alerts
CREATE POLICY "sos_select_own"
  ON public.sos_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- Elder creates alerts
CREATE POLICY "sos_insert_own"
  ON public.sos_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Elder can resolve (update status)
CREATE POLICY "sos_update_own"
  ON public.sos_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Guardians can read alerts for their linked elders
CREATE POLICY "sos_guardian_select"
  ON public.sos_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links
      WHERE guardian_id = auth.uid()
        AND elder_id = sos_alerts.user_id
        AND status = 'connected'
    )
  );

-- Add to realtime so guardian screens can react immediately
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sos_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
  END IF;
END $$;
