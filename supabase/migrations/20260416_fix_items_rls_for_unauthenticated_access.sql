-- Migration: Fix RLS policies for uniforms and school_supplies tables to allow unauthenticated access
-- Ensures all item types (textbooks, uniforms, school supplies) are visible to unauthenticated users

-- Enable RLS on uniforms table if not already enabled
ALTER TABLE public.uniforms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on uniforms table if they exist
DROP POLICY IF EXISTS "Authenticated users can create their own uniforms" ON public.uniforms;
DROP POLICY IF EXISTS "Users can view their own uniforms or public uniforms" ON public.uniforms;
DROP POLICY IF EXISTS "Users can update their own uniforms" ON public.uniforms;
DROP POLICY IF EXISTS "Users can delete their own uniforms" ON public.uniforms;
DROP POLICY IF EXISTS "Service role can manage all uniforms" ON public.uniforms;

-- Policy 1: Authenticated users can INSERT their own uniforms
CREATE POLICY "Authenticated users can create their own uniforms"
  ON public.uniforms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id AND auth.uid() IS NOT NULL);

-- Policy 2: Users can SELECT their own uniforms or publicly available uniforms (including unauthenticated users)
CREATE POLICY "Users can view their own uniforms or public uniforms"
  ON public.uniforms
  FOR SELECT
  USING (
    auth.uid() = seller_id OR
    status = 'available'
  );

-- Policy 3: Users can UPDATE their own uniforms
CREATE POLICY "Users can update their own uniforms"
  ON public.uniforms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Policy 4: Users can DELETE their own uniforms
CREATE POLICY "Users can delete their own uniforms"
  ON public.uniforms
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Policy 5: Service role can manage all uniforms
CREATE POLICY "Service role can manage all uniforms"
  ON public.uniforms
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable RLS on school_supplies table if not already enabled
ALTER TABLE public.school_supplies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on school_supplies table if they exist
DROP POLICY IF EXISTS "Authenticated users can create their own school_supplies" ON public.school_supplies;
DROP POLICY IF EXISTS "Users can view their own school_supplies or public school_supplies" ON public.school_supplies;
DROP POLICY IF EXISTS "Users can update their own school_supplies" ON public.school_supplies;
DROP POLICY IF EXISTS "Users can delete their own school_supplies" ON public.school_supplies;
DROP POLICY IF EXISTS "Service role can manage all school_supplies" ON public.school_supplies;

-- Policy 1: Authenticated users can INSERT their own school supplies
CREATE POLICY "Authenticated users can create their own school_supplies"
  ON public.school_supplies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id AND auth.uid() IS NOT NULL);

-- Policy 2: Users can SELECT their own school supplies or publicly available items (including unauthenticated users)
CREATE POLICY "Users can view their own school_supplies or public school_supplies"
  ON public.school_supplies
  FOR SELECT
  USING (
    auth.uid() = seller_id OR
    status = 'available'
  );

-- Policy 3: Users can UPDATE their own school supplies
CREATE POLICY "Users can update their own school_supplies"
  ON public.school_supplies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Policy 4: Users can DELETE their own school supplies
CREATE POLICY "Users can delete their own school_supplies"
  ON public.school_supplies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Policy 5: Service role can manage all school supplies
CREATE POLICY "Service role can manage all school_supplies"
  ON public.school_supplies
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uniforms_seller_id ON public.uniforms(seller_id);
CREATE INDEX IF NOT EXISTS idx_uniforms_status ON public.uniforms(status);
CREATE INDEX IF NOT EXISTS idx_school_supplies_seller_id ON public.school_supplies(seller_id);
CREATE INDEX IF NOT EXISTS idx_school_supplies_status ON public.school_supplies(status);
