-- 032: User subscription plan columns on profiles.
-- Safe to re-run — all statements use IF NOT EXISTS.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_type       TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_status     TEXT        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_amount     INTEGER,
  ADD COLUMN IF NOT EXISTS plan_currency   TEXT        NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS plan_interval   TEXT;

-- Constraints
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_plan_type_check
    CHECK (plan_type IN ('free', 'sathi_basic', 'sathi_pro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_plan_status_check
    CHECK (plan_status IN ('active', 'expired', 'cancelled', 'trial'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_plan_interval_check
    CHECK (plan_interval IN ('month', 'year') OR plan_interval IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill existing rows
UPDATE public.profiles
  SET plan_type = 'free', plan_status = 'active'
  WHERE plan_type IS NULL OR plan_type = '';
