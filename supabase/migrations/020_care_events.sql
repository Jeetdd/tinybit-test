-- 020: care_events table + mime_type column on health_records
-- Safe to re-run — all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ────────────────────────────────────────────────────────────────
-- TABLE: care_events (Care Calendar feature)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.care_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  sub         TEXT        NOT NULL DEFAULT '',
  time        TEXT        NOT NULL DEFAULT '',
  type        TEXT        NOT NULL DEFAULT 'Doctor'
                CHECK (type IN ('Doctor','Family','Medicine','Wellness')),
  color       TEXT        NOT NULL DEFAULT '#DB5461',
  emoji       TEXT        NOT NULL DEFAULT '🏥',
  date        INTEGER     NOT NULL,
  month       TEXT        NOT NULL,
  year        INTEGER     NOT NULL,
  timestamp   BIGINT      NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- COLUMN: mime_type on health_records (from migration 019 step 2)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- ────────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS care_events_user_ts_idx
  ON public.care_events(user_id, timestamp ASC);

CREATE INDEX IF NOT EXISTS care_events_user_date_idx
  ON public.care_events(user_id, year, month, date);

-- ────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.care_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_events_select_own" ON public.care_events;
CREATE POLICY "care_events_select_own"
  ON public.care_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "care_events_insert_own" ON public.care_events;
CREATE POLICY "care_events_insert_own"
  ON public.care_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "care_events_delete_own" ON public.care_events;
CREATE POLICY "care_events_delete_own"
  ON public.care_events FOR DELETE
  USING (auth.uid() = user_id);
