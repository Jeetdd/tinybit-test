-- ================================================================
-- MODULE 25: Journal (Memory Journal)
-- Safe to run even if the table already exists.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.journal (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'Written',  -- 'Written' | 'Voice'
  content     TEXT        NOT NULL DEFAULT '',
  audio_uri   TEXT,
  prompt      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEX
CREATE INDEX IF NOT EXISTS journal_user_created_idx
  ON public.journal(user_id, created_at DESC);

-- RLS
ALTER TABLE public.journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_select_own" ON public.journal;
CREATE POLICY "journal_select_own"
  ON public.journal FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_insert_own" ON public.journal;
CREATE POLICY "journal_insert_own"
  ON public.journal FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_update_own" ON public.journal;
CREATE POLICY "journal_update_own"
  ON public.journal FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_delete_own" ON public.journal;
CREATE POLICY "journal_delete_own"
  ON public.journal FOR DELETE USING (auth.uid() = user_id);
