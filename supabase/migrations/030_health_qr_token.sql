-- 030: Add health QR card token for emergency health card feature.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS health_qr_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS health_qr_expires_at TIMESTAMPTZ;
