-- Migration: Add FK from listing_views.listing_id to books.id and fix RLS for seller access
-- This enables PostgREST implicit joins (books?select=*,listing_views(id)) and allows
-- sellers to see view counts for their own listings.

-- 0. Clean up orphaned listing_views rows (listing_id referencing deleted books)
DELETE FROM public.listing_views
WHERE listing_id NOT IN (SELECT id FROM public.books);

-- 1. Add foreign key constraint (listing_id already references books conceptually, but FK was missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_listing_views_books'
      AND table_name = 'listing_views'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.listing_views
      ADD CONSTRAINT fk_listing_views_books
      FOREIGN KEY (listing_id) REFERENCES public.books(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Add RLS policy so sellers can SELECT listing_views for their own listings
-- Currently only admins can SELECT, which means sellers always get 0 views
DROP POLICY IF EXISTS "sellers_view_own_listing_views" ON public.listing_views;
CREATE POLICY "sellers_view_own_listing_views"
  ON public.listing_views
  FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.books WHERE seller_id = (SELECT auth.uid())
    )
  );

-- 3. Create index to support the RLS subquery efficiently
CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id
  ON public.listing_views(listing_id);
