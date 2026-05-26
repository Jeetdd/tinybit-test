-- When an elder's profile.email is set or updated, automatically stamp their
-- elder_id into any pending guardian_elder_links that match that email.
-- This handles the case where the guardian sends an invite BEFORE the elder registers.

CREATE OR REPLACE FUNCTION public.link_pending_guardian_invites()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND (OLD.email IS DISTINCT FROM NEW.email OR OLD.email IS NULL) THEN
    UPDATE public.guardian_elder_links
    SET elder_id = NEW.id
    WHERE elder_email = lower(NEW.email)
      AND status = 'pending'
      AND elder_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_link_elder_invites ON public.profiles;
CREATE TRIGGER auto_link_elder_invites
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_pending_guardian_invites();