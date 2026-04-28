-- ================================================================
-- MODULE 11: Family Messages
-- Safe to run even if the table already exists.
-- Paste and run this entire file in your Supabase SQL Editor.
-- ================================================================

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.family_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('voice', 'photo', 'text')),
  content     TEXT,
  media_url   TEXT,
  duration    INTEGER,
  is_read     BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADD FK CONSTRAINTS if the table already existed without them
DO $$ BEGIN
  ALTER TABLE public.family_messages
    ADD CONSTRAINT family_messages_sender_fk
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
             WHEN others         THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.family_messages
    ADD CONSTRAINT family_messages_receiver_fk
    FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
             WHEN others         THEN NULL;
END $$;

-- 3. UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS family_messages_updated_at ON public.family_messages;
CREATE TRIGGER family_messages_updated_at
  BEFORE UPDATE ON public.family_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS family_messages_receiver_idx ON public.family_messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS family_messages_sender_idx   ON public.family_messages(sender_id);

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON public.family_messages;
CREATE POLICY "messages_select_participant"
  ON public.family_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert_own" ON public.family_messages;
CREATE POLICY "messages_insert_own"
  ON public.family_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_update_receiver" ON public.family_messages;
CREATE POLICY "messages_update_receiver"
  ON public.family_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- 6. ALLOW READING SENDER PROFILE via join
-- PostgREST needs to read profiles.full_name when resolving the
-- sender:profiles!sender_id join. The current RLS only allows
-- users to read their own profile row, so the join returns null.
-- This policy lets any authenticated user read basic profile info.
DROP POLICY IF EXISTS "profiles_select_others_basic" ON public.profiles;
CREATE POLICY "profiles_select_others_basic"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');
