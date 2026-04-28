-- ================================================================
-- MODULE 6: Daily Check-In
-- Safe to run even if the table already exists.
-- Paste and run this entire file in your Supabase SQL Editor.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.daily_check_ins (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date                DATE        NOT NULL DEFAULT CURRENT_DATE,

  -- Mood (matches daily-check-in screen labels)
  mood                TEXT        CHECK (mood IN ('Great','Good','Okay','Low','Unwell')),
  mood_score          INTEGER     CHECK (mood_score BETWEEN 1 AND 5),

  -- Questions answered (stored as JSON array of {id, done})
  questions           JSONB       DEFAULT '[]'::jsonb,

  -- Sleep
  sleep_quality       TEXT        CHECK (sleep_quality IN ('Very Poor','Poor','Fair','Good','Excellent')),
  sleep_hours         NUMERIC(4,1) CHECK (sleep_hours BETWEEN 0 AND 24),

  -- Vitals / wellbeing
  energy_level        TEXT        CHECK (energy_level IN ('Very Low','Low','Moderate','High','Very High')),
  pain_level          INTEGER     CHECK (pain_level BETWEEN 0 AND 10),
  appetite            TEXT        CHECK (appetite IN ('Poor','Fair','Good','Excellent')),
  medications_taken   BOOLEAN     DEFAULT false,
  physical_activity   TEXT        CHECK (physical_activity IN ('None','Light','Moderate','Vigorous')),
  activity_minutes    INTEGER     CHECK (activity_minutes >= 0),
  social_interaction  TEXT        CHECK (social_interaction IN ('None','Minimal','Moderate','High')),

  -- Voice note
  notes               TEXT,
  voice_note_url      TEXT,
  voice_note_duration INTEGER,

  -- Status
  completed_at        TIMESTAMPTZ DEFAULT NOW(),
  family_notified     BOOLEAN     DEFAULT false,
  notified_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One check-in per user per day
DO $$ BEGIN
  ALTER TABLE public.daily_check_ins
    ADD CONSTRAINT daily_check_ins_user_date_unique UNIQUE (user_id, date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- TRIGGER
DROP TRIGGER IF EXISTS daily_check_ins_updated_at ON public.daily_check_ins;
CREATE TRIGGER daily_check_ins_updated_at
  BEFORE UPDATE ON public.daily_check_ins
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- INDEXES
CREATE INDEX IF NOT EXISTS daily_check_ins_user_date_idx
  ON public.daily_check_ins(user_id, date DESC);

-- RLS
ALTER TABLE public.daily_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkins_select_own" ON public.daily_check_ins;
CREATE POLICY "checkins_select_own"
  ON public.daily_check_ins FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "checkins_insert_own" ON public.daily_check_ins;
CREATE POLICY "checkins_insert_own"
  ON public.daily_check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "checkins_update_own" ON public.daily_check_ins;
CREATE POLICY "checkins_update_own"
  ON public.daily_check_ins FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "checkins_delete_own" ON public.daily_check_ins;
CREATE POLICY "checkins_delete_own"
  ON public.daily_check_ins FOR DELETE USING (auth.uid() = user_id);
