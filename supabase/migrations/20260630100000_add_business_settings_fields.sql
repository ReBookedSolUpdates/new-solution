-- Migration to add business settings fields

-- Add business_name to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Add instagram_handle to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- Add show_address_to_public to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_address_to_public BOOLEAN DEFAULT false;

-- Add show_phone_to_public to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_phone_to_public BOOLEAN DEFAULT false;
