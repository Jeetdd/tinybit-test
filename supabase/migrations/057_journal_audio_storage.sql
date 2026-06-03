-- ================================================================
-- MODULE 57: Journal Audio Storage
-- Creates a Supabase Storage bucket for voice journal recordings.
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-audio',
  'journal-audio',
  true,
  10485760,  -- 10 MB
  ARRAY['audio/m4a', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can upload their own recordings
DROP POLICY IF EXISTS "journal_audio_insert" ON storage.objects;
CREATE POLICY "journal_audio_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can read their own recordings
DROP POLICY IF EXISTS "journal_audio_select" ON storage.objects;
CREATE POLICY "journal_audio_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can delete their own recordings
DROP POLICY IF EXISTS "journal_audio_delete" ON storage.objects;
CREATE POLICY "journal_audio_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);