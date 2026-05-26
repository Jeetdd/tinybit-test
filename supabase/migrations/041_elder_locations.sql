-- ================================================================
-- MODULE 41: Elder real-time location table
-- Stores the most recent GPS fix for each elder.
-- Guardian reads via RLS. Elder writes/updates their own row.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.elder_locations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  accuracy      REAL,
  address       TEXT,
  is_sharing    BOOLEAN     NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT elder_locations_elder_unique UNIQUE (elder_id)
);

CREATE INDEX IF NOT EXISTS elder_locations_elder_idx
  ON public.elder_locations(elder_id);

-- ── Enable Realtime (safe: skip if already a member) ─────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'elder_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.elder_locations;
  END IF;
END $$;

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.elder_locations ENABLE ROW LEVEL SECURITY;

-- Elder can insert/update their own location
DROP POLICY IF EXISTS "el_insert_own" ON public.elder_locations;
CREATE POLICY "el_insert_own"
  ON public.elder_locations FOR INSERT
  WITH CHECK (auth.uid() = elder_id);

DROP POLICY IF EXISTS "el_update_own" ON public.elder_locations;
CREATE POLICY "el_update_own"
  ON public.elder_locations FOR UPDATE
  USING (auth.uid() = elder_id);

DROP POLICY IF EXISTS "el_select_own" ON public.elder_locations;
CREATE POLICY "el_select_own"
  ON public.elder_locations FOR SELECT
  USING (auth.uid() = elder_id);

-- Guardian can read location of connected elders
DROP POLICY IF EXISTS "el_guardian_read" ON public.elder_locations;
CREATE POLICY "el_guardian_read"
  ON public.elder_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id    = elder_locations.elder_id
        AND g.status      = 'connected'
    )
  );
