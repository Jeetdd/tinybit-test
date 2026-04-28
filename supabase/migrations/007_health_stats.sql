-- ================================================================
-- MODULE 7: Health Stats
-- Safe to run even if the table already exists.
-- Paste and run this entire file in your Supabase SQL Editor.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.health_stats (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recorded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by             TEXT        NOT NULL DEFAULT 'self'
                            CHECK (recorded_by IN ('self','caregiver','device','automatic')),
  device_id               TEXT,
  notes                   TEXT,

  -- Blood sugar (frontend: blood_sugar, blood_sugar_status)
  blood_sugar             NUMERIC(6,2) CHECK (blood_sugar >= 0 AND blood_sugar <= 600),
  blood_sugar_unit        TEXT        DEFAULT 'mg/dL' CHECK (blood_sugar_unit IN ('mg/dL','mmol/L')),
  blood_sugar_status      TEXT        CHECK (blood_sugar_status IN ('Very Low','Low','Normal','High','Very High')),
  blood_sugar_fasting     BOOLEAN     DEFAULT false,

  -- Blood pressure (frontend: blood_pressure_sys, blood_pressure_dia)
  blood_pressure_sys      INTEGER     CHECK (blood_pressure_sys >= 0 AND blood_pressure_sys <= 300),
  blood_pressure_dia      INTEGER     CHECK (blood_pressure_dia >= 0 AND blood_pressure_dia <= 200),
  blood_pressure_unit     TEXT        DEFAULT 'mmHg',
  blood_pressure_status   TEXT        CHECK (blood_pressure_status IN ('Low','Normal','Elevated','High Stage 1','High Stage 2','Crisis')),
  blood_pressure_position TEXT        DEFAULT 'sitting' CHECK (blood_pressure_position IN ('sitting','standing','lying')),

  -- Heart rate
  heart_rate              INTEGER     CHECK (heart_rate >= 0 AND heart_rate <= 300),
  heart_rate_unit         TEXT        DEFAULT 'bpm',
  heart_rate_status       TEXT        CHECK (heart_rate_status IN ('Bradycardia','Normal','Tachycardia')),

  -- Weight
  weight                  NUMERIC(6,2) CHECK (weight >= 0 AND weight <= 500),
  weight_unit             TEXT        DEFAULT 'kg' CHECK (weight_unit IN ('kg','lbs')),

  -- Temperature
  temperature             NUMERIC(5,2) CHECK (temperature >= 0 AND temperature <= 50),
  temperature_unit        TEXT        DEFAULT 'C' CHECK (temperature_unit IN ('C','F')),
  temperature_status      TEXT        CHECK (temperature_status IN ('Hypothermia','Normal','Fever','High Fever')),

  -- Oxygen saturation
  oxygen_saturation       NUMERIC(5,2) CHECK (oxygen_saturation >= 0 AND oxygen_saturation <= 100),
  oxygen_saturation_unit  TEXT        DEFAULT '%',
  oxygen_saturation_status TEXT       CHECK (oxygen_saturation_status IN ('Low','Normal','High')),

  -- Sleep
  sleep_duration          NUMERIC(4,1) CHECK (sleep_duration >= 0 AND sleep_duration <= 24),
  sleep_quality           TEXT        CHECK (sleep_quality IN ('Very Poor','Poor','Fair','Good','Excellent')),
  sleep_bed_time          TEXT,       -- HH:MM
  sleep_wake_time         TEXT,       -- HH:MM

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- TRIGGER
-- ────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS health_stats_updated_at ON public.health_stats;
CREATE TRIGGER health_stats_updated_at
  BEFORE UPDATE ON public.health_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────────
-- Home screen: .order('recorded_at', { ascending: false }).limit(1)
CREATE INDEX IF NOT EXISTS health_stats_user_recorded_idx
  ON public.health_stats(user_id, recorded_at DESC);

-- ────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.health_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_stats_select_own" ON public.health_stats;
CREATE POLICY "health_stats_select_own"
  ON public.health_stats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "health_stats_insert_own" ON public.health_stats;
CREATE POLICY "health_stats_insert_own"
  ON public.health_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "health_stats_update_own" ON public.health_stats;
CREATE POLICY "health_stats_update_own"
  ON public.health_stats FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "health_stats_delete_own" ON public.health_stats;
CREATE POLICY "health_stats_delete_own"
  ON public.health_stats FOR DELETE
  USING (auth.uid() = user_id);
