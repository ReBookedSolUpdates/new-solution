-- Migration: Create business_collaborators table for team member management
-- Created: 2026-07-17

CREATE TABLE IF NOT EXISTS public.business_collaborators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    status text NOT NULL DEFAULT 'Pending Invite',
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_collaborators ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can manage collaborators for their own business" ON public.business_collaborators;
CREATE POLICY "Users can manage collaborators for their own business"
ON public.business_collaborators
FOR ALL
USING (business_id = auth.uid())
WITH CHECK (business_id = auth.uid());
