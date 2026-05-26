-- 017: Add health & emergency profile fields missing from the initial migration.
-- Safe to re-run — all statements use IF NOT EXISTS.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country             TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language  TEXT,
  ADD COLUMN IF NOT EXISTS biological_sex      TEXT,
  ADD COLUMN IF NOT EXISTS height              TEXT,
  ADD COLUMN IF NOT EXISTS height_unit         TEXT DEFAULT 'ft',
  ADD COLUMN IF NOT EXISTS weight              TEXT,
  ADD COLUMN IF NOT EXISTS weight_unit         TEXT DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS blood_group         TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_relation  TEXT DEFAULT '';
