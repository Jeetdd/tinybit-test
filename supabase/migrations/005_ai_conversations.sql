-- ================================================================
-- MODULE 5: AI Conversations
-- Safe to run even if the table already exists.
-- Paste and run this entire file in your Supabase SQL Editor.
-- ================================================================

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS ai_conversations_user_created_idx
  ON public.ai_conversations(user_id, created_at DESC);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conversations_select_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_select_own"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_insert_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_insert_own"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_delete_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_delete_own"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);
