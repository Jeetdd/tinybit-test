-- ================================================================
-- MODULE 48: notifications — persistent activity feed
-- Stores cross-user notifications (elder ↔ guardian).
-- RLS: only sender can INSERT; only recipient can SELECT/UPDATE/DELETE.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  data       JSONB       DEFAULT '{}'::jsonb,
  read       BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_user_id_idx    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_created_at_idx ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notif_unread_idx     ON public.notifications(user_id) WHERE NOT read;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own"       ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_as_sender" ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own"       ON public.notifications;
DROP POLICY IF EXISTS "notif_delete_own"       ON public.notifications;

-- Recipient reads their own notifications
CREATE POLICY "notif_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated user can insert when they are the sender
CREATE POLICY "notif_insert_as_sender"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Recipient can mark as read
CREATE POLICY "notif_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Recipient can delete
CREATE POLICY "notif_delete_own"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
