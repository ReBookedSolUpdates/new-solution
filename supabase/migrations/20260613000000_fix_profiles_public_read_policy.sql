-- Migration: Allow public read of profiles table so buyers can see seller info
-- This fixes the issue where seller name is displayed as "Seller" and checkout fails because profile cannot be retrieved.

CREATE POLICY "profiles_public_select" ON public.profiles
    FOR SELECT
    USING (true);
