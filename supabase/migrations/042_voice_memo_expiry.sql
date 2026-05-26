-- ================================================================
-- MODULE 42: Auto-expire voice memos after 7 days
-- Paste and run in Supabase SQL Editor.
-- Requires pg_cron (enabled by default on Supabase Pro;
-- on free tier run the manual cleanup function on demand).
-- ================================================================

-- 1. Enable pg_cron (safe no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Function that deletes voice memos older than 7 days.
--    SECURITY DEFINER so it runs as the table owner and bypasses RLS.
CREATE OR REPLACE FUNCTION public.cleanup_expired_voice_memos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.family_messages
  WHERE type        IN ('voice', 'text')
    AND created_at  < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE LOG 'cleanup_expired_voice_memos: deleted % rows', deleted_count;
  END IF;
END;
$$;

-- 3. Grant execute to the postgres role used by cron
GRANT EXECUTE ON FUNCTION public.cleanup_expired_voice_memos() TO postgres;

-- 4. Schedule the job: runs every day at 03:00 UTC.
--    If a job with this name already exists, unschedule first.
SELECT cron.unschedule('cleanup-voice-memos-7days')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-voice-memos-7days'
);

SELECT cron.schedule(
  'cleanup-voice-memos-7days',   -- job name
  '0 3 * * *',                   -- cron: every day at 03:00 UTC
  'SELECT public.cleanup_expired_voice_memos()'
);

-- 5. Row-Level Security: allow the system (postgres / service role) to delete
--    expired rows. The app-side RLS already allows senders to delete their own;
--    this adds a separate policy for the scheduled function.
DROP POLICY IF EXISTS "voice_memo_expire_7d" ON public.family_messages;
CREATE POLICY "voice_memo_expire_7d"
  ON public.family_messages
  FOR DELETE
  USING (
    type       IN ('voice', 'text')
    AND created_at < NOW() - INTERVAL '7 days'
  );

-- ── Verify the schedule was registered ────────────────────────────────────────
-- Run this SELECT to confirm (optional):
-- SELECT jobid, jobname, schedule, command, active
-- FROM cron.job
-- WHERE jobname = 'cleanup-voice-memos-7days';
