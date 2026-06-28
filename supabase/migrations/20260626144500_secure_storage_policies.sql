-- Migration: Secure Storage Policies for Public Buckets
-- Public storage buckets serve files directly via their public URL and do not require broad SELECT policies.
-- Removing these policies prevents users from listing the entire contents of the buckets via the API.

DROP POLICY IF EXISTS "Anyone can view article images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view book images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Profile pictures are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public read book images" ON storage.objects;
DROP POLICY IF EXISTS "Public read documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read school supply images" ON storage.objects;
DROP POLICY IF EXISTS "Public read uniform images" ON storage.objects;
DROP POLICY IF EXISTS "book_images_read" ON storage.objects;
