-- Migration 060: Daily Health Check-In unified view
-- Adds columns to daily_check_ins that the new unified screen writes.
-- All columns are nullable so existing rows are unaffected.

ALTER TABLE public.daily_check_ins
  ADD COLUMN IF NOT EXISTS sleep_quality  TEXT,
  ADD COLUMN IF NOT EXISTS pain_level     TEXT,
  ADD COLUMN IF NOT EXISTS physical_activity TEXT;

-- health_logs already exists and accepts type = 'bp' | 'sugar' | 'weight'.
-- No changes needed there.

-- Ensure guardian_check_in_shares has the columns the unified screen upserts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardian_check_in_shares'
      AND column_name = 'questions_summary'
  ) THEN
    ALTER TABLE public.guardian_check_in_shares
      ADD COLUMN questions_summary TEXT;
  END IF;
END$$;
