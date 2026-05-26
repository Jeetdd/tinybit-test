-- 035: Ensure all medical profile columns exist.
-- This handles cases where 031 was partially applied or modified.
-- Safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS medical_conditions  TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS other_condition     TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS medications         JSONB     DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS doctor_name         TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS doctor_contact      TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS allergies           TEXT[]    DEFAULT '{}';

-- Also ensure indexes for these fields if needed for guardian monitoring
CREATE INDEX IF NOT EXISTS profiles_medical_conditions_idx ON public.profiles USING GIN (medical_conditions);
