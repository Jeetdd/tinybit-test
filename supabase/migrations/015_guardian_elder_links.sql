-- Guardian-Elder connection links
CREATE TABLE IF NOT EXISTS public.guardian_elder_links (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  guardian_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  elder_id      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  elder_email   text        NOT NULL,
  parent_name   text        NOT NULL,
  relation      text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'connected', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Push token column on profiles (for Expo push notifications)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guardian_elder_links_guardian ON public.guardian_elder_links(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_elder_links_elder    ON public.guardian_elder_links(elder_id);
CREATE INDEX IF NOT EXISTS idx_guardian_elder_links_email    ON public.guardian_elder_links(elder_email);

-- RLS
ALTER TABLE public.guardian_elder_links ENABLE ROW LEVEL SECURITY;

-- Guardian sees and manages their own links
CREATE POLICY "guardian_manage_own_links"
  ON public.guardian_elder_links
  FOR ALL
  USING (guardian_id = auth.uid())
  WITH CHECK (guardian_id = auth.uid());

-- Elder sees links sent to their email and can update status
CREATE POLICY "elder_view_own_invitations"
  ON public.guardian_elder_links
  FOR SELECT
  USING (
    elder_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "elder_respond_to_invitation"
  ON public.guardian_elder_links
  FOR UPDATE
  USING (
    elder_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (status IN ('connected', 'declined'));

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guardian_elder_links_updated_at ON public.guardian_elder_links;
CREATE TRIGGER guardian_elder_links_updated_at
  BEFORE UPDATE ON public.guardian_elder_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
