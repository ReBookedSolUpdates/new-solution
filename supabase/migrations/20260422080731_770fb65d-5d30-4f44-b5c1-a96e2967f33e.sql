ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update their own order notifications"
ON public.order_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their own order notifications"
ON public.order_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage order notifications"
ON public.order_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can mark their own cart abandonment as recovered"
ON public.cart_abandonment_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);