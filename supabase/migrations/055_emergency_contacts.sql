-- ================================================================
-- MODULE 55: Emergency Contacts
-- User-added contacts shown on the SOS screen.
-- Separate from the single emergency_phone on profiles.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT '',   -- relation / label
  phone      TEXT        NOT NULL,
  color      TEXT        NOT NULL DEFAULT '#F0F4FF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emergency_contacts_user_idx
  ON public.emergency_contacts(user_id, created_at ASC);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_select_own" ON public.emergency_contacts;
DROP POLICY IF EXISTS "ec_insert_own" ON public.emergency_contacts;
DROP POLICY IF EXISTS "ec_update_own" ON public.emergency_contacts;
DROP POLICY IF EXISTS "ec_delete_own" ON public.emergency_contacts;

CREATE POLICY "ec_select_own"
  ON public.emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ec_insert_own"
  ON public.emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ec_update_own"
  ON public.emergency_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "ec_delete_own"
  ON public.emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);
