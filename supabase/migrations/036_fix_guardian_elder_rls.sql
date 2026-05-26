-- ================================================================
-- MODULE 36: Fix guardian_elder_links RLS for phone-auth elders
--            + expand relation constraint to match app values
-- ================================================================
-- Root cause of "permission denied for table users":
--   Old policies used (SELECT email FROM auth.users WHERE id = auth.uid())
--   which the authenticated role cannot access.
-- Fix: use auth.email() for JWT email claim (no table access needed),
--      plus a public.profiles subquery for phone-auth users whose JWT has no email.

-- ── Drop old broken policies ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "elder_view_own_invitations"   ON public.guardian_elder_links;
DROP POLICY IF EXISTS "elder_respond_to_invitation"  ON public.guardian_elder_links;

-- ── SELECT: elder can see invitations sent to their email ─────────────────────
CREATE POLICY "elder_view_own_invitations"
  ON public.guardian_elder_links
  FOR SELECT
  USING (
    -- Already linked by ID (post-acceptance)
    elder_id = auth.uid()
    -- Email/Google auth: auth.email() reads from JWT claims, no table access required
    OR elder_email = lower(auth.email())
    -- Phone-auth: email is in profiles (set during onboarding), not in JWT
    OR elder_email = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

-- ── UPDATE: elder can accept or decline pending invitations ───────────────────
CREATE POLICY "elder_respond_to_invitation"
  ON public.guardian_elder_links
  FOR UPDATE
  USING (
    elder_id = auth.uid()
    OR (elder_id IS NULL AND elder_email = lower(auth.email()))
    OR (elder_id IS NULL AND elder_email = lower((SELECT email FROM public.profiles WHERE id = auth.uid())))
  )
  WITH CHECK (status IN ('connected', 'declined'));

-- ── Fix relation constraint to include all values the app uses ────────────────
ALTER TABLE public.guardian_elder_links
  DROP CONSTRAINT IF EXISTS gel_relationship_check;

ALTER TABLE public.guardian_elder_links
  ADD CONSTRAINT gel_relationship_check
  CHECK (relation IN (
    'Father', 'Mother', 'Son', 'Daughter',
    'Grandfather', 'Grandmother', 'Uncle', 'Aunt',
    'Spouse', 'Sibling', 'Relative', 'Friend',
    'Nurse', 'Caregiver', 'Family', 'Other'
  ));
