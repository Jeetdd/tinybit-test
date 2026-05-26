-- 026: Add doctor_phone column to medicines.
-- The AddMedicineModal inserts this field; it was missing from the schema.
-- Safe to re-run.

ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS doctor_phone TEXT;
