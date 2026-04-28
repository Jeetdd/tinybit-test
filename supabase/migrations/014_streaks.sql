-- ================================================================
-- MODULE 14: Streaks
-- Safe to run even if the table already exists.
-- Paste and run this entire file in your Supabase SQL Editor.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.streaks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL
                     CHECK (type IN ('medicine','journal','checkin','mindgames','overall')),

  current_streak   INTEGER     NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak   INTEGER     NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_active_date DATE,
  total_days       INTEGER     NOT NULL DEFAULT 0 CHECK (total_days >= 0),

  -- History as JSONB array: [{date, completed, value}]
  history          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Milestones as JSONB array: [{streak, achieved_at, reward}]
  milestones       JSONB       NOT NULL DEFAULT '[]'::jsonb,

  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One streak row per user per type
DO $$ BEGIN
  ALTER TABLE public.streaks
    ADD CONSTRAINT streaks_user_type_unique UNIQUE (user_id, type);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- TRIGGER
DROP TRIGGER IF EXISTS streaks_updated_at ON public.streaks;
CREATE TRIGGER streaks_updated_at
  BEFORE UPDATE ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-update longest_streak when current_streak increases
CREATE OR REPLACE FUNCTION public.sync_longest_streak()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_streak > NEW.longest_streak THEN
    NEW.longest_streak := NEW.current_streak;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS streaks_sync_longest ON public.streaks;
CREATE TRIGGER streaks_sync_longest
  BEFORE INSERT OR UPDATE OF current_streak ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION public.sync_longest_streak();

-- INDEXES
CREATE INDEX IF NOT EXISTS streaks_user_type_idx ON public.streaks(user_id, type);

-- RLS
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "streaks_select_own" ON public.streaks;
CREATE POLICY "streaks_select_own"
  ON public.streaks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "streaks_insert_own" ON public.streaks;
CREATE POLICY "streaks_insert_own"
  ON public.streaks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "streaks_update_own" ON public.streaks;
CREATE POLICY "streaks_update_own"
  ON public.streaks FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "streaks_delete_own" ON public.streaks;
CREATE POLICY "streaks_delete_own"
  ON public.streaks FOR DELETE USING (auth.uid() = user_id);
