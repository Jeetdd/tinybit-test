-- ================================================================
-- MODULE 43: Deduplicate guardian_elder_links + prevent future dupes
-- Paste and run in Supabase SQL Editor.
-- ================================================================

-- 1. Remove duplicate rows — keep only the most recent link per pair.
--    "Most recent" = highest created_at among (guardian_id, elder_id) pairs.
DELETE FROM public.guardian_elder_links
WHERE id NOT IN (
  SELECT DISTINCT ON (guardian_id, elder_id) id
  FROM public.guardian_elder_links
  ORDER BY guardian_id, elder_id, created_at DESC
);

-- 2. Add unique constraint so this can never happen again.
ALTER TABLE public.guardian_elder_links
  ADD CONSTRAINT uq_guardian_elder UNIQUE (guardian_id, elder_id);

-- 3. Allow the elder to unlink (delete) any guardian from their side.
DROP POLICY IF EXISTS "elder_unlink_guardian" ON public.guardian_elder_links;
CREATE POLICY "elder_unlink_guardian"
  ON public.guardian_elder_links
  FOR DELETE
  USING (elder_id = auth.uid());
