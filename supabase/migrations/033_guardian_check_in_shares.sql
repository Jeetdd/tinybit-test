-- 033: Guardian check-in shares
-- Lightweight table that lets guardians see their elder's daily check-in.
-- The elder app writes here after every check-in; guardians read via RLS.
-- Safe to re-run — uses IF NOT EXISTS guards.

CREATE TABLE IF NOT EXISTS public.guardian_check_in_shares (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date              DATE        NOT NULL,
  mood              TEXT,
  mood_score        INTEGER     CHECK (mood_score BETWEEN 1 AND 5),
  questions_summary TEXT,
  shared_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One share per elder per day (upsert target)
DO $$ BEGIN
  ALTER TABLE public.guardian_check_in_shares
    ADD CONSTRAINT guardian_check_in_shares_elder_date_unique UNIQUE (elder_id, date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS guardian_check_in_shares_updated_at ON public.guardian_check_in_shares;
CREATE TRIGGER guardian_check_in_shares_updated_at
  BEFORE UPDATE ON public.guardian_check_in_shares
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for guardian queries by elder_id
CREATE INDEX IF NOT EXISTS guardian_check_in_shares_elder_date_idx
  ON public.guardian_check_in_shares(elder_id, date DESC);

-- RLS
ALTER TABLE public.guardian_check_in_shares ENABLE ROW LEVEL SECURITY;

-- Elder can insert and update their own shares
DROP POLICY IF EXISTS "shares_insert_own" ON public.guardian_check_in_shares;
CREATE POLICY "shares_insert_own"
  ON public.guardian_check_in_shares FOR INSERT
  WITH CHECK (auth.uid() = elder_id);

DROP POLICY IF EXISTS "shares_update_own" ON public.guardian_check_in_shares;
CREATE POLICY "shares_update_own"
  ON public.guardian_check_in_shares FOR UPDATE
  USING (auth.uid() = elder_id);

-- Elder can read their own shares
DROP POLICY IF EXISTS "shares_select_own" ON public.guardian_check_in_shares;
CREATE POLICY "shares_select_own"
  ON public.guardian_check_in_shares FOR SELECT
  USING (auth.uid() = elder_id);

-- Guardian can read shares of their linked elders (accepted links only)
DROP POLICY IF EXISTS "shares_guardian_read" ON public.guardian_check_in_shares;
CREATE POLICY "shares_guardian_read"
  ON public.guardian_check_in_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links
      WHERE guardian_id = auth.uid()
        AND elder_id = guardian_check_in_shares.elder_id
        AND status = 'accepted'
    )
  );
