-- 018: Add columns missing from the medicines table.
-- Safe to re-run — all statements use IF NOT EXISTS.

ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS generic_name            TEXT,
  ADD COLUMN IF NOT EXISTS dosage_unit             TEXT NOT NULL DEFAULT 'tablet',
  ADD COLUMN IF NOT EXISTS schedule_time           TEXT NOT NULL DEFAULT 'Morning',
  ADD COLUMN IF NOT EXISTS time                    TEXT,
  ADD COLUMN IF NOT EXISTS days_of_week            INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  ADD COLUMN IF NOT EXISTS instruction             TEXT,
  ADD COLUMN IF NOT EXISTS notes                   TEXT,
  ADD COLUMN IF NOT EXISTS prescribed_by           TEXT,
  ADD COLUMN IF NOT EXISTS frequency               TEXT NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS start_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date                DATE,
  ADD COLUMN IF NOT EXISTS is_recurring            BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority                TEXT NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS category                TEXT NOT NULL DEFAULT 'prescription',
  ADD COLUMN IF NOT EXISTS stock                   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_stock             INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refill_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS refill_threshold        INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS is_active               BOOLEAN NOT NULL DEFAULT true;
