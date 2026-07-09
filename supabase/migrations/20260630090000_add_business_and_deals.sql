-- Migration to add business account and deals support

-- Add is_business column to profiles if it does not exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT false;

-- Add original_price column to books if it does not exist
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS original_price NUMERIC;
