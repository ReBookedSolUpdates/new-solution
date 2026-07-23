-- Migration: Add collaborator_id to business_collaborators, create business_quick_responses, and update RLS policies

-- 1. Update business_collaborators table schema
ALTER TABLE public.business_collaborators 
ADD COLUMN IF NOT EXISTS collaborator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create custom quick responses table
CREATE TABLE IF NOT EXISTS public.business_quick_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on quick responses
ALTER TABLE public.business_quick_responses ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS policies for business_quick_responses
CREATE POLICY "quick_responses_owner_all" ON public.business_quick_responses
    FOR ALL USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());

CREATE POLICY "quick_responses_collaborator_select" ON public.business_quick_responses
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE (collaborator_id = auth.uid() OR email = auth.jwt()->>'email') AND status = 'Active'
        )
    );

-- 4. Add RLS policies for active collaborators
-- profiles
CREATE POLICY "profiles_collaborator_update" ON public.profiles
    FOR UPDATE USING (
        id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE collaborator_id = auth.uid() AND status = 'Active' AND role IN ('Admin', 'Editor')
        )
    ) WITH CHECK (
        id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE collaborator_id = auth.uid() AND status = 'Active' AND role IN ('Admin', 'Editor')
        )
    );

-- books (listings)
CREATE POLICY "books_collaborator_insert" ON public.books
    FOR INSERT WITH CHECK (
        seller_id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE collaborator_id = auth.uid() AND status = 'Active' AND role IN ('Admin', 'Editor')
        )
    );

CREATE POLICY "books_collaborator_update" ON public.books
    FOR UPDATE USING (
        seller_id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE collaborator_id = auth.uid() AND status = 'Active' AND role IN ('Admin', 'Editor')
        )
    );

CREATE POLICY "books_collaborator_delete" ON public.books
    FOR DELETE USING (
        seller_id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE collaborator_id = auth.uid() AND status = 'Active' AND role IN ('Admin', 'Editor')
        )
    );

-- orders
CREATE POLICY "orders_collaborator_select" ON public.orders
    FOR SELECT USING (
        seller_id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE collaborator_id = auth.uid() AND status = 'Active'
        )
    );

CREATE POLICY "orders_collaborator_update" ON public.orders
    FOR UPDATE USING (
        seller_id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE collaborator_id = auth.uid() AND status = 'Active' AND role IN ('Admin', 'Editor')
        )
    );

-- conversations
CREATE POLICY "conversations_collaborator_select" ON public.conversations
    FOR SELECT USING (
        seller_id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE collaborator_id = auth.uid() AND status = 'Active'
        )
    );

CREATE POLICY "conversations_collaborator_update" ON public.conversations
    FOR UPDATE USING (
        seller_id IN (
            SELECT business_id FROM public.business_collaborators
            WHERE collaborator_id = auth.uid() AND status = 'Active'
        )
    );

-- messages
CREATE POLICY "messages_collaborator_select" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND c.seller_id IN (
                  SELECT business_id FROM public.business_collaborators
                  WHERE collaborator_id = auth.uid() AND status = 'Active'
              )
        )
    );

CREATE POLICY "messages_collaborator_insert" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND c.seller_id IN (
                  SELECT business_id FROM public.business_collaborators
                  WHERE collaborator_id = auth.uid() AND status = 'Active'
              )
        )
    );

CREATE POLICY "messages_update" ON public.messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

CREATE POLICY "messages_collaborator_update" ON public.messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND c.seller_id IN (
                  SELECT business_id FROM public.business_collaborators
                  WHERE collaborator_id = auth.uid() AND status = 'Active'
              )
        )
    );

-- business_collaborators (allow select and update for invited users)
CREATE POLICY "business_collaborators_invited_select" ON public.business_collaborators
    FOR SELECT USING (
        email = auth.jwt()->>'email' OR collaborator_id = auth.uid()
    );

CREATE POLICY "business_collaborators_invited_update" ON public.business_collaborators
    FOR UPDATE USING (
        email = auth.jwt()->>'email' OR collaborator_id = auth.uid()
    ) WITH CHECK (
        email = auth.jwt()->>'email' OR collaborator_id = auth.uid()
    );
