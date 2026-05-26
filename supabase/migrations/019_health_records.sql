-- 019: health_records table + doctor_phone column on medicines
-- Safe to re-run — all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ────────────────────────────────────────────────────────────────
-- TABLE: health_records (Health Vault feature)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_records (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  date        TEXT        NOT NULL,
  timestamp   BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  size        TEXT        NOT NULL DEFAULT '0 MB',
  type        TEXT        NOT NULL DEFAULT 'Report',
  category    TEXT        NOT NULL DEFAULT 'Reports'
                CHECK (category IN ('Reports','Prescriptions','X-Rays','Blood Tests')),
  icon_name   TEXT        NOT NULL DEFAULT 'document-text-outline',
  badge_bg    TEXT        NOT NULL DEFAULT '#FDEAF0',
  badge_color TEXT        NOT NULL DEFAULT '#E05A7A',
  uri         TEXT,
  ai_read     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- COLUMN: doctor_phone on medicines
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS doctor_phone TEXT;

-- ────────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS health_records_user_ts_idx
  ON public.health_records(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS health_records_user_category_idx
  ON public.health_records(user_id, category);

-- ────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_records_select_own" ON public.health_records;
CREATE POLICY "health_records_select_own"
  ON public.health_records FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "health_records_insert_own" ON public.health_records;
CREATE POLICY "health_records_insert_own"
  ON public.health_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "health_records_delete_own" ON public.health_records;
CREATE POLICY "health_records_delete_own"
  ON public.health_records FOR DELETE
  USING (auth.uid() = user_id);
