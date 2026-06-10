-- ================================================================
-- MODULE 58: Calorie Goals & Calorie Logs
-- ================================================================

-- ── calorie_goals ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calorie_goals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_calories  INTEGER     NOT NULL DEFAULT 2000 CHECK (daily_calories > 0 AND daily_calories <= 10000),
  protein_g       INTEGER     NOT NULL DEFAULT 60   CHECK (protein_g >= 0),
  carbs_g         INTEGER     NOT NULL DEFAULT 250  CHECK (carbs_g >= 0),
  fat_g           INTEGER     NOT NULL DEFAULT 65   CHECK (fat_g >= 0),
  diet_type       TEXT        NOT NULL DEFAULT 'balanced'
    CHECK (diet_type IN ('balanced','diabetic','heart-healthy','high-protein','vegetarian','low-sodium','weight-loss')),
  activity_level  TEXT        NOT NULL DEFAULT 'light'
    CHECK (activity_level IN ('sedentary','light','moderate','active','very-active')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT calorie_goals_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS calorie_goals_user_idx ON public.calorie_goals(user_id);

ALTER TABLE public.calorie_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calorie_goals_select_own" ON public.calorie_goals;
CREATE POLICY "calorie_goals_select_own"  ON public.calorie_goals FOR SELECT  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "calorie_goals_insert_own" ON public.calorie_goals;
CREATE POLICY "calorie_goals_insert_own"  ON public.calorie_goals FOR INSERT  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "calorie_goals_update_own" ON public.calorie_goals;
CREATE POLICY "calorie_goals_update_own"  ON public.calorie_goals FOR UPDATE  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "calorie_goals_delete_own" ON public.calorie_goals;
CREATE POLICY "calorie_goals_delete_own"  ON public.calorie_goals FOR DELETE  USING (auth.uid() = user_id);

-- ── calorie_logs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calorie_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  food_items      TEXT[]      NOT NULL DEFAULT '{}',
  total_calories  INTEGER     NOT NULL DEFAULT 0 CHECK (total_calories >= 0),
  protein         NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs           NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat             NUMERIC(6,1) NOT NULL DEFAULT 0,
  fiber           NUMERIC(6,1) NOT NULL DEFAULT 0,
  sugar           NUMERIC(6,1),
  health_score    NUMERIC(3,1),
  health_rating   TEXT,
  image_uri       TEXT,
  serving_info    TEXT,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calorie_logs_user_date_idx ON public.calorie_logs(user_id, logged_date DESC);

ALTER TABLE public.calorie_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calorie_logs_select_own" ON public.calorie_logs;
CREATE POLICY "calorie_logs_select_own"  ON public.calorie_logs FOR SELECT  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "calorie_logs_insert_own" ON public.calorie_logs;
CREATE POLICY "calorie_logs_insert_own"  ON public.calorie_logs FOR INSERT  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "calorie_logs_delete_own" ON public.calorie_logs;
CREATE POLICY "calorie_logs_delete_own"  ON public.calorie_logs FOR DELETE  USING (auth.uid() = user_id);
