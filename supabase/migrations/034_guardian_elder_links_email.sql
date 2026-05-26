-- Add all columns that 015_guardian_elder_links.sql defined via CREATE TABLE IF NOT EXISTS
-- but were missing because the table already existed before that migration ran.
ALTER TABLE public.guardian_elder_links
  ADD COLUMN IF NOT EXISTS elder_email  text,
  ADD COLUMN IF NOT EXISTS parent_name  text,
  ADD COLUMN IF NOT EXISTS relation     text,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

-- elder_id must be nullable: invitations can be sent before the elder has signed up
ALTER TABLE public.guardian_elder_links
  ALTER COLUMN elder_id DROP NOT NULL;

-- Replace any existing status check constraint with the correct allowed values
ALTER TABLE public.guardian_elder_links
  DROP CONSTRAINT IF EXISTS gel_status_check,
  DROP CONSTRAINT IF EXISTS guardian_elder_links_status_check;

ALTER TABLE public.guardian_elder_links
  ADD CONSTRAINT guardian_elder_links_status_check
  CHECK (status IN ('pending', 'connected', 'declined'));

-- Backfill elder_email from auth.users where elder_id is known
UPDATE public.guardian_elder_links gel
SET elder_email = u.email
FROM auth.users u
WHERE gel.elder_id = u.id
  AND gel.elder_email IS NULL;

-- Drop old relationship constraint (was on a 'relationship' column, now superseded by 'relation')
-- and add correct constraint on the 'relation' column
ALTER TABLE public.guardian_elder_links
  DROP CONSTRAINT IF EXISTS gel_relationship_check;

ALTER TABLE public.guardian_elder_links
  ADD CONSTRAINT gel_relationship_check
  CHECK (relation IN (
    'Father','Mother','Son','Daughter',
    'Spouse','Sibling','Relative','Friend',
    'Nurse','Caregiver','Family','Other'
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guardian_elder_links_email
  ON public.guardian_elder_links(elder_email);

-- updated_at trigger (function may already exist from migration 015)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guardian_elder_links_updated_at ON public.guardian_elder_links;
CREATE TRIGGER guardian_elder_links_updated_at
  BEFORE UPDATE ON public.guardian_elder_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
