-- Add email column to profiles so guardians can look up elders by email
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Index for fast guardian lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
