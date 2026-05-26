-- ================================================================
-- MODULE 47: health-records Supabase Storage bucket
-- Files are stored at {elder_id}/{timestamp}_{filename}
-- so both elder and their guardian can upload/read.
-- Run in Supabase SQL Editor.
-- ================================================================

-- Create bucket (public so URLs work without signed tokens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-records',
  'health-records',
  true,
  20971520,   -- 20 MB per file
  ARRAY[
    'image/jpeg','image/png','image/webp','image/heic',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Elder can upload to their own folder  ({user_id}/...)
DROP POLICY IF EXISTS "hr_insert_own" ON storage.objects;
CREATE POLICY "hr_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'health-records'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Guardian can upload to a connected elder's folder
DROP POLICY IF EXISTS "hr_insert_guardian" ON storage.objects;
CREATE POLICY "hr_insert_guardian"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'health-records'
    AND EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id::text = (storage.foldername(name))[1]
        AND g.status = 'connected'
    )
  );

-- Anyone authenticated can read (bucket is public anyway, belt-and-suspenders)
DROP POLICY IF EXISTS "hr_select_auth" ON storage.objects;
CREATE POLICY "hr_select_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'health-records');

-- Elder can delete their own files
DROP POLICY IF EXISTS "hr_delete_own" ON storage.objects;
CREATE POLICY "hr_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'health-records'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Guardian can delete files in a connected elder's folder
DROP POLICY IF EXISTS "hr_delete_guardian" ON storage.objects;
CREATE POLICY "hr_delete_guardian"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'health-records'
    AND EXISTS (
      SELECT 1 FROM public.guardian_elder_links g
      WHERE g.guardian_id = auth.uid()
        AND g.elder_id::text = (storage.foldername(name))[1]
        AND g.status = 'connected'
    )
  );
