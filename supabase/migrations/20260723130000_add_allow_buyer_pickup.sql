-- Migration: Add allow_buyer_pickup column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allow_buyer_pickup BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.allow_buyer_pickup IS 'Allows business sellers to toggle whether buyers can pick up orders from their physical address.';
