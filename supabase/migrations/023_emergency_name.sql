-- 023: Add emergency_name column missing from 017 migration.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emergency_name TEXT DEFAULT '';
