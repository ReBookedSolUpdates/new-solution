-- 1. Drop broken trigger and function that referenced a nonexistent aps_profile column
DROP TRIGGER IF EXISTS update_aps_profile_timestamp_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.update_aps_profile_timestamp();

-- 2. Fix existing uniform listings whose availability got set to 'sold' but aren't actually sold
UPDATE public.uniforms
SET availability = 'available'
WHERE sold = false AND availability != 'available';

-- 3. Same for school_supplies (defensive)
UPDATE public.school_supplies
SET availability = 'available'
WHERE sold = false AND availability != 'available';