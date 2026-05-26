-- ================================================================
-- MODULE 38: Re-apply guardian read policies for medicines
-- Fixes 0/0 medicines showing on guardian home screen.
-- Safe to run multiple times (DROP IF EXISTS + CREATE).
-- ================================================================

-- Guardian can SELECT medicines belonging to their connected elders
DROP POLICY IF EXISTS "guardian_read_elder_medicines" ON public.medicines;
CREATE POLICY "guardian_read_elder_medicines"
  ON public.medicines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = user_id
        AND g.status      = 'connected'
    )
  );

-- Guardian can SELECT medicine_logs for their connected elders
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
