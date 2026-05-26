-- ================================================================
-- MODULE 28: Guardian cross-user read policies
-- Allows a connected guardian to read their linked elders' health data.
-- Run AFTER 015_guardian_elder_links.sql
-- ================================================================

-- ── profiles ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "guardian_read_elder_profile" ON public.profiles;
CREATE POLICY "guardian_read_elder_profile"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = id
        AND g.status      = 'connected'
    )
  );

-- ── moods ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "guardian_read_elder_moods" ON public.moods;
CREATE POLICY "guardian_read_elder_moods"
  ON public.moods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = user_id
        AND g.status      = 'connected'
    )
  );

-- ── daily_check_ins ────────────────────────────────────────────
DROP POLICY IF EXISTS "guardian_read_elder_checkins" ON public.daily_check_ins;
CREATE POLICY "guardian_read_elder_checkins"
  ON public.daily_check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = user_id
        AND g.status      = 'connected'
    )
  );

-- ── medicines ──────────────────────────────────────────────────
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

-- ── medicine_logs ──────────────────────────────────────────────
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

-- ── streaks ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "guardian_read_elder_streaks" ON public.streaks;
CREATE POLICY "guardian_read_elder_streaks"
  ON public.streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = user_id
        AND g.status      = 'connected'
    )
  );

-- ── health_stats ───────────────────────────────────────────────
DROP POLICY IF EXISTS "guardian_read_elder_health_stats" ON public.health_stats;
CREATE POLICY "guardian_read_elder_health_stats"
  ON public.health_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = user_id
        AND g.status      = 'connected'
    )
  );
