-- Migration: Recreate Covering Indexes for Foreign Keys
-- These covering indexes are required for foreign key constraints to prevent table locks and optimize deletion/update operations on referenced tables.

CREATE INDEX IF NOT EXISTS idx_coupons_affiliate_id ON public.coupons (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_listing_id ON public.wishlists (listing_id);
