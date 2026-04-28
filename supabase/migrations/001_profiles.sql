-- ================================================================
-- MODULE 1: User Profiles
-- Safe to run even if the profiles table already exists.
-- Paste and run this entire file in your Supabase SQL Editor.
-- ================================================================

-- 1. CREATE TABLE (no-op if it already exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADD MISSING COLUMNS (safe to re-run — IF NOT EXISTS)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name    TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name     TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_name     TEXT,
  ADD COLUMN IF NOT EXISTS email         TEXT,
  ADD COLUMN IF NOT EXISTS mobile        TEXT,
  ADD COLUMN IF NOT EXISTS country_code  TEXT        DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS age           INTEGER,
  ADD COLUMN IF NOT EXISTS gender        TEXT,
  ADD COLUMN IF NOT EXISTS role          TEXT        NOT NULL DEFAULT 'elder',
  ADD COLUMN IF NOT EXISTS profile_image TEXT,
  ADD COLUMN IF NOT EXISTS cover_image   TEXT,
  ADD COLUMN IF NOT EXISTS bio           TEXT,
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN     DEFAULT true,
  ADD COLUMN IF NOT EXISTS family_code   TEXT,
  ADD COLUMN IF NOT EXISTS settings      JSONB       DEFAULT '{
    "notifications": {"push": true, "email": true, "sms": false},
    "privacy": {"shareLocation": true, "shareHealthData": true},
    "language": "en",
    "theme": "auto"
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS last_login    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS device_info   JSONB       DEFAULT '[]'::jsonb;

-- 3. ADD CONSTRAINTS (skip if they already exist)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_gender_check
    CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('elder', 'guardian', 'caregiver', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_bio_length
    CHECK (char_length(bio) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_family_code_unique UNIQUE (family_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS profiles_role_active_idx  ON public.profiles(role, is_active);
CREATE INDEX IF NOT EXISTS profiles_family_code_idx  ON public.profiles(family_code);
CREATE INDEX IF NOT EXISTS profiles_email_idx        ON public.profiles(email);

-- 6. SHARED updated_at TRIGGER FUNCTION (reused by all modules)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. FULL NAME SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.full_name := TRIM(NEW.first_name || ' ' || NEW.last_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_full_name ON public.profiles;
CREATE TRIGGER profiles_sync_full_name
  BEFORE INSERT OR UPDATE OF first_name, last_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_full_name();

-- 8. AGE CALCULATION TRIGGER
CREATE OR REPLACE FUNCTION public.calculate_age()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age := DATE_PART('year', AGE(NEW.date_of_birth::DATE))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_calculate_age ON public.profiles;
CREATE TRIGGER profiles_calculate_age
  BEFORE INSERT OR UPDATE OF date_of_birth ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.calculate_age();

-- 9. FAMILY CODE GENERATOR
CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars  TEXT    := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT    := '';
  i      INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_family_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  IF NEW.role = 'elder' AND NEW.family_code IS NULL THEN
    LOOP
      new_code := public.generate_family_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE family_code = new_code);
      attempts := attempts + 1;
      EXIT WHEN attempts > 20;
    END LOOP;
    NEW.family_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_family_code ON public.profiles;
CREATE TRIGGER profiles_set_family_code
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_family_code();

-- 10. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. BACKFILL existing rows that are missing full_name
UPDATE public.profiles
  SET full_name = TRIM(first_name || ' ' || last_name)
  WHERE full_name IS NULL OR full_name = '';

-- 12. BACKFILL family_code for existing elders that don't have one
DO $$
DECLARE
  rec     RECORD;
  new_code TEXT;
  attempts INTEGER;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE role = 'elder' AND family_code IS NULL LOOP
    attempts := 0;
    LOOP
      new_code := public.generate_family_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE family_code = new_code);
      attempts := attempts + 1;
      EXIT WHEN attempts > 20;
    END LOOP;
    UPDATE public.profiles SET family_code = new_code WHERE id = rec.id;
  END LOOP;
END;
$$;
