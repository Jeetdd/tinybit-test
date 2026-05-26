-- 027: Fix daily_check_ins mood constraint.
-- The old constraint only accepted: 'Great','Good','Okay','Low','Unwell'
-- The app sends:                     'Happy','calm','Tired','Low','Okay'
-- Replace with a combined set that accepts both so old data is preserved.

ALTER TABLE public.daily_check_ins
  DROP CONSTRAINT IF EXISTS daily_check_ins_mood_check;

ALTER TABLE public.daily_check_ins
  ADD CONSTRAINT daily_check_ins_mood_check
  CHECK (mood IN ('Happy', 'calm', 'Okay', 'Tired', 'Low', 'Great', 'Good', 'Unwell') OR mood IS NULL);
