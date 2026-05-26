-- 031: Add medical profile columns saved by the onboarding medical screen.
-- Safe to re-run — all statements use IF NOT EXISTS.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS medical_conditions  TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS other_condition     TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS medications         JSONB     DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS doctor_name         TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS doctor_contact      TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS allergies           TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS date_of_birth       DATE;
