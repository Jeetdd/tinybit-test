-- 059: Add has_allergies boolean column to profiles.
-- The onboarding medical screen writes this field but it was never migrated.
-- Safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_allergies BOOLEAN DEFAULT false;
