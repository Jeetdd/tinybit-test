-- 021: replace Medicine/Wellness event types with Therapy/Activity
-- Migrates existing rows before updating the constraint.

-- Remap old types to nearest new equivalents
UPDATE public.care_events SET type = 'Therapy'  WHERE type = 'Wellness';
UPDATE public.care_events SET type = 'Activity' WHERE type = 'Medicine';

ALTER TABLE public.care_events
  DROP CONSTRAINT IF EXISTS care_events_type_check;

ALTER TABLE public.care_events
  ADD CONSTRAINT care_events_type_check
  CHECK (type IN ('Doctor', 'Family', 'Therapy', 'Activity'));
