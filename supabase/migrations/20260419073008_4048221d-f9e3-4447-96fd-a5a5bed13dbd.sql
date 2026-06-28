-- 1) Allow conversations to reference any item type (not just books). Drop FK so school_supplies/uniforms work.
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_listing_id_fkey;

-- Add an item_type so we can resolve listings of any kind
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'book';

-- 2) Make chat-media bucket private (URLs accessed via signed URLs from client)
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

-- Replace public read with participant-only access using path convention "<conversation_id>/<file>"
DROP POLICY IF EXISTS "Public read chat media" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own chat media" ON storage.objects;

-- Allow conversation participants to read media in their conversation folder
CREATE POLICY "Chat participants can read chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media' AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- Allow conversation participants to upload to their conversation folder
CREATE POLICY "Chat participants can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- Allow uploader to delete their own media
CREATE POLICY "Users can delete their own chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' AND owner = auth.uid()
);

-- 3) One-time fix: orders that are paid but stuck in pending_payment should move to pending_commit
UPDATE public.orders
SET status = 'pending_commit',
    commit_deadline = COALESCE(commit_deadline, now() + interval '48 hours'),
    updated_at = now()
WHERE payment_status = 'paid'
  AND status IN ('pending_payment', 'pending');