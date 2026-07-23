-- Migration: Create cancellation_feedback table for tracking subscription cancellation reasons
-- Created: 2026-07-23

CREATE TABLE IF NOT EXISTS public.cancellation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert cancellation feedback" ON public.cancellation_feedback;
DROP POLICY IF EXISTS "Users can view own cancellation feedback" ON public.cancellation_feedback;

-- Create policy for users to insert their feedback
CREATE POLICY "Users can insert cancellation feedback" ON public.cancellation_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to view their feedback
CREATE POLICY "Users can view own cancellation feedback" ON public.cancellation_feedback
    FOR SELECT USING (auth.uid() = user_id);
