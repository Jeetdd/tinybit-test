-- 024: Add location column missing from profiles table.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location TEXT;
