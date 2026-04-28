-- ================================================================
-- MODULE 2: Mood Tracking
-- Safe to run even if the table already exists.
-- Paste and run this entire file in your Supabase SQL Editor.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.moods (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- UI labels from daily-check-in screen (Great/Good/Okay/Low/Unwell)
  mood        TEXT        NOT NULL
                CHECK (mood IN ('Great','Good','Okay','Low','Unwell')),
  mood_score  INTEGER     NOT NULL CHECK (mood_score BETWEEN 1 AND 5),

  -- Optional enrichment
  factors     TEXT[]      DEFAULT '{}',
  activities  TEXT[]      DEFAULT '{}',
  notes       TEXT,

  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  time        TEXT,                     -- HH:MM

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One mood entry per user per day
DO $$ BEGIN
  ALTER TABLE public.moods
    ADD CONSTRAINT moods_user_date_unique UNIQUE (user_id, date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- TRIGGER
DROP TRIGGER IF EXISTS moods_updated_at ON public.moods;
CREATE TRIGGER moods_updated_at
  BEFORE UPDATE ON public.moods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- INDEXES
CREATE INDEX IF NOT EXISTS moods_user_date_idx ON public.moods(user_id, date DESC);

-- RLS
ALTER TABLE public.moods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moods_select_own" ON public.moods;
CREATE POLICY "moods_select_own"
  ON public.moods FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "moods_insert_own" ON public.moods;
CREATE POLICY "moods_insert_own"
  ON public.moods FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "moods_update_own" ON public.moods;
CREATE POLICY "moods_update_own"
  ON public.moods FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "moods_delete_own" ON public.moods;
CREATE POLICY "moods_delete_own"
  ON public.moods FOR DELETE USING (auth.uid() = user_id);
