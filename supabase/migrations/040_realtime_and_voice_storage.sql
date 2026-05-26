-- ================================================================
-- MODULE 40: Enable Realtime on all key tables
--            + Voice Messages Supabase Storage bucket + RLS
-- ================================================================

-- ── Enable Realtime (safe: only adds if not already a member) ────
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'family_messages','medicines','medicine_logs',
    'daily_check_ins','moods','journal_entries',
    'care_events','guardian_elder_links','profiles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ── family_messages table: ensure is_read + duration columns ─────
ALTER TABLE public.family_messages
  ADD COLUMN IF NOT EXISTS is_read    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration   INTEGER,
  ADD COLUMN IF NOT EXISTS content    TEXT,
  ADD COLUMN IF NOT EXISTS media_url  TEXT;

-- ── RLS for family_messages ───────────────────────────────────────
ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fm_select_own" ON public.family_messages;
CREATE POLICY "fm_select_own"
  ON public.family_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "fm_insert_own" ON public.family_messages;
CREATE POLICY "fm_insert_own"
  ON public.family_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "fm_update_read" ON public.family_messages;
CREATE POLICY "fm_update_read"
  ON public.family_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "fm_delete_own" ON public.family_messages;
CREATE POLICY "fm_delete_own"
  ON public.family_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ── Supabase Storage: voice-messages bucket ───────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  true,
  10485760,
  ARRAY['audio/m4a', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "vm_insert_own" ON storage.objects;
CREATE POLICY "vm_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "vm_select_public" ON storage.objects;
CREATE POLICY "vm_select_public"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'voice-messages');

DROP POLICY IF EXISTS "vm_delete_own" ON storage.objects;
CREATE POLICY "vm_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
