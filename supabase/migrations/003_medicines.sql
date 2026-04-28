-- ================================================================
-- MODULE 3: Medicines + Medicine Logs
-- Safe to run even if the tables already exist.
-- Paste and run this entire file in your Supabase SQL Editor.
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- TABLE: medicines
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medicines (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Core identity (matches frontend MedicineRow type exactly)
  name                    TEXT        NOT NULL,
  generic_name            TEXT,
  dosage                  TEXT        NOT NULL DEFAULT '',
  dosage_unit             TEXT        NOT NULL DEFAULT 'tablet'
                            CHECK (dosage_unit IN ('mg','ml','tablet','capsule','drop','patch','injection','other')),

  -- Schedule (what the medicine screen reads)
  schedule_time           TEXT        NOT NULL DEFAULT 'Morning'
                            CHECK (schedule_time IN ('Morning','Afternoon','Night')),
  time                    TEXT,                     -- display time e.g. "8:00 AM"
  days_of_week            INTEGER[]   NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
                                                    -- 0=Sun … 6=Sat (JS getDay() convention)

  -- Instructions & notes
  instruction             TEXT,                     -- frontend uses 'instruction' (singular)
  notes                   TEXT,
  prescribed_by           TEXT,

  -- Frequency & dates
  frequency               TEXT        NOT NULL DEFAULT 'once'
                            CHECK (frequency IN ('once','twice','thrice','four_times','as_needed','weekly','monthly')),
  start_date              DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date                DATE,
  is_recurring            BOOLEAN     NOT NULL DEFAULT true,

  -- Priority & category
  priority                TEXT        NOT NULL DEFAULT 'Medium'
                            CHECK (priority IN ('Critical','High','Medium','Low')),
  category                TEXT        NOT NULL DEFAULT 'prescription'
                            CHECK (category IN ('prescription','otc','supplement','vitamin','other')),

  -- Stock (frontend reads as 'stock')
  stock                   INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  total_stock             INTEGER     NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  refill_reminder_enabled BOOLEAN     NOT NULL DEFAULT true,
  refill_threshold        INTEGER     NOT NULL DEFAULT 7, -- days

  is_active               BOOLEAN     NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- TABLE: medicine_logs
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medicine_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  medicine_id UUID        NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  taken_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes       TEXT
);

-- ────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS medicines_updated_at ON public.medicines;
CREATE TRIGGER medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────────
-- medicines
CREATE INDEX IF NOT EXISTS medicines_user_active_idx
  ON public.medicines(user_id, is_active);

CREATE INDEX IF NOT EXISTS medicines_user_priority_idx
  ON public.medicines(user_id, priority);

-- medicine_logs  (the home screen joins on this + taken_at range)
CREATE INDEX IF NOT EXISTS medicine_logs_user_taken_idx
  ON public.medicine_logs(user_id, taken_at DESC);

CREATE INDEX IF NOT EXISTS medicine_logs_medicine_taken_idx
  ON public.medicine_logs(medicine_id, taken_at DESC);

-- ────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — medicines
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medicines_select_own" ON public.medicines;
CREATE POLICY "medicines_select_own"
  ON public.medicines FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "medicines_insert_own" ON public.medicines;
CREATE POLICY "medicines_insert_own"
  ON public.medicines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "medicines_update_own" ON public.medicines;
CREATE POLICY "medicines_update_own"
  ON public.medicines FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "medicines_delete_own" ON public.medicines;
CREATE POLICY "medicines_delete_own"
  ON public.medicines FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — medicine_logs
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.medicine_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medicine_logs_select_own" ON public.medicine_logs;
CREATE POLICY "medicine_logs_select_own"
  ON public.medicine_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "medicine_logs_insert_own" ON public.medicine_logs;
CREATE POLICY "medicine_logs_insert_own"
  ON public.medicine_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "medicine_logs_delete_own" ON public.medicine_logs;
CREATE POLICY "medicine_logs_delete_own"
  ON public.medicine_logs FOR DELETE
  USING (auth.uid() = user_id);
