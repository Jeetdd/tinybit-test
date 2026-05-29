-- ================================================================
-- MODULE 54: Add is_banned flag + phone alias to profiles
-- Safe to re-run — uses IF NOT EXISTS / DO blocks
-- ================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone     TEXT;

-- Index for fast admin queries filtering banned users
CREATE INDEX IF NOT EXISTS profiles_is_banned_idx ON public.profiles(is_banned) WHERE is_banned = true;
