-- Migration: Add platform_fee column to orders table
-- Created: 2026-06-28

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;
