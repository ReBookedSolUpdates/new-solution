-- Migration: Recreate storage policies for book, uniform, and school supply images
-- Created: 2026-06-28

-- Drop existing select policies if any
DROP POLICY IF EXISTS "Anyone can view book images" ON storage.objects;
DROP POLICY IF EXISTS "Public read book images" ON storage.objects;
DROP POLICY IF EXISTS "Public read school supply images" ON storage.objects;
DROP POLICY IF EXISTS "Public read uniform images" ON storage.objects;
DROP POLICY IF EXISTS "book_images_read" ON storage.objects;

-- Re-create public read (SELECT) policies so users can view images
CREATE POLICY "Public read book images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'book-images');

CREATE POLICY "Public read uniform images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'uniform-images');

CREATE POLICY "Public read school supply images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'school-supply-images');

-- Drop existing upload (INSERT) policies to clean up potential conflicts
DROP POLICY IF EXISTS "Authenticated users can upload book images" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload school supply images" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload uniform images" ON storage.objects;

-- Create clean and robust upload (INSERT) policies
CREATE POLICY "Auth upload book images" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'book-images' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

CREATE POLICY "Auth upload uniform images" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'uniform-images' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

CREATE POLICY "Auth upload school supply images" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'school-supply-images' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update their own book images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update own school supply images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update own uniform images" ON storage.objects;

-- Create clean UPDATE policies
CREATE POLICY "Auth update book images" 
ON storage.objects FOR UPDATE TO authenticated 
USING (
    bucket_id = 'book-images' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

CREATE POLICY "Auth update uniform images" 
ON storage.objects FOR UPDATE TO authenticated 
USING (
    bucket_id = 'uniform-images' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

CREATE POLICY "Auth update school supply images" 
ON storage.objects FOR UPDATE TO authenticated 
USING (
    bucket_id = 'school-supply-images' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Users can delete their own book images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own school supply images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own uniform images" ON storage.objects;

-- Create clean DELETE policies
CREATE POLICY "Auth delete book images" 
ON storage.objects FOR DELETE TO authenticated 
USING (
    bucket_id = 'book-images' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

CREATE POLICY "Auth delete uniform images" 
ON storage.objects FOR DELETE TO authenticated 
USING (
    bucket_id = 'uniform-images' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

CREATE POLICY "Auth delete school supply images" 
ON storage.objects FOR DELETE TO authenticated 
USING (
    bucket_id = 'school-supply-images' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);
