-- ================================================================
-- MODULE 37: Fix guardian_check_in_shares RLS + add note column
-- ================================================================

-- Add note column (for voice note URL or free-text note from check-in)
ALTER TABLE public.guardian_check_in_shares
  ADD COLUMN IF NOT EXISTS note TEXT;

-- Fix RLS: old policy used status = 'accepted', correct value is 'connected'
DROP POLICY IF EXISTS "shares_guardian_read" ON public.guardian_check_in_shares;
CREATE POLICY "shares_guardian_read"
  ON public.guardian_check_in_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_elder_links
      WHERE guardian_id = auth.uid()
        AND elder_id = guardian_check_in_shares.elder_id
        AND status = 'connected'
    )
  );

-- Enable Realtime on this table so GuardianHomeScreen can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.guardian_check_in_shares;
