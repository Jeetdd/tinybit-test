-- ================================================================
-- MODULE 39: Allow guardians to INSERT / UPDATE / DELETE medicines
--            for their connected elders.
--
-- Root cause: 003_medicines.sql only allows auth.uid() = user_id,
-- so when a guardian inserts a medicine with user_id = elder_id
-- the policy rejects it with error 42501.
--
-- Safe to run multiple times (DROP IF EXISTS + CREATE).
-- ================================================================

-- ── medicines: guardian write policies ───────────────────────────

-- INSERT: guardian can add a medicine whose user_id is a connected elder
DROP POLICY IF EXISTS "guardian_insert_elder_medicine" ON public.medicines;
CREATE POLICY "guardian_insert_elder_medicine"
  ON public.medicines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = medicines.user_id
        AND g.status      = 'connected'
    )
  );

-- UPDATE: guardian can update a medicine belonging to a connected elder
DROP POLICY IF EXISTS "guardian_update_elder_medicine" ON public.medicines;
CREATE POLICY "guardian_update_elder_medicine"
  ON public.medicines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = medicines.user_id
        AND g.status      = 'connected'
    )
  );

-- DELETE: guardian can delete a medicine belonging to a connected elder
DROP POLICY IF EXISTS "guardian_delete_elder_medicine" ON public.medicines;
CREATE POLICY "guardian_delete_elder_medicine"
  ON public.medicines
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = medicines.user_id
        AND g.status      = 'connected'
    )
  );

-- ── medicine_logs: guardian write policies ────────────────────────
-- Guardian does not directly write logs (elder does), so no insert/delete
-- needed here. SELECT is already covered by 038_fix_guardian_medicine_rls.sql.
