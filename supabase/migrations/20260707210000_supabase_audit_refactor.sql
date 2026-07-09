-- Migration: Phase 1 — Database Audit and Refactoring
-- Resolves exposed SECURITY DEFINER search paths and adds missing foreign key indexes for performance

-- 1. Secure exposed SECURITY DEFINER functions by setting search_path = public
ALTER FUNCTION public.materialize_order_from_intent(text, text) SET search_path = public;
ALTER FUNCTION public.create_order_with_wallet_deduction(text, uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, jsonb, text, text, jsonb, text, text, text, text, text, text, numeric, text, text, integer, numeric, jsonb, text, boolean, numeric, integer) SET search_path = public;
ALTER FUNCTION public.decline_order_and_restore_inventory(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.process_book_purchase_atomic(uuid, uuid, uuid, numeric, text, text, jsonb, text) SET search_path = public;
ALTER FUNCTION public.create_order_with_wallet_deduction(text, uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, jsonb, text, text, jsonb, text, text, text, text, text, text, numeric, text, text, integer, numeric, jsonb, text, boolean, numeric) SET search_path = public;
ALTER FUNCTION public.lock_order_for_commitment(uuid) SET search_path = public;
ALTER FUNCTION public.track_profile_changes() SET search_path = public;
ALTER FUNCTION public.update_profile_last_active() SET search_path = public;
ALTER FUNCTION public.get_seller_payout_rate(uuid) SET search_path = public;
ALTER FUNCTION public.handle_auto_responder() SET search_path = public;

-- 2. Add missing indexes on foreign key columns
CREATE INDEX IF NOT EXISTS idx_books_seller_id ON public.books(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_buyer_feedback_orders_book_id ON public.buyer_feedback_orders(book_id);
CREATE INDEX IF NOT EXISTS idx_buyer_feedback_orders_seller_id ON public.buyer_feedback_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate_id ON public.affiliate_earnings(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_order_id ON public.affiliate_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referrals_affiliate_id ON public.affiliates_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_article_feedback_article_id ON public.article_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON public.article_images(article_id);
CREATE INDEX IF NOT EXISTS idx_article_reports_article_id ON public.article_reports(article_id);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_buyer_feedback_orders_buyer_id ON public.buyer_feedback_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_cashout_request_affiliate_id ON public.cashout_request(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_cashout_request_processed_by ON public.cashout_request(processed_by);
CREATE INDEX IF NOT EXISTS idx_chat_reports_conversation_id ON public.chat_reports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_checkout_events_order_id ON public.checkout_events(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_affiliate_earnings_affiliate_id ON public.coupon_affiliate_earnings(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_coupon_affiliate_earnings_coupon_id ON public.coupon_affiliate_earnings(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_affiliate_earnings_coupon_redemption_id ON public.coupon_affiliate_earnings(coupon_redemption_id);
CREATE INDEX IF NOT EXISTS idx_coupon_affiliate_earnings_order_id ON public.coupon_affiliate_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_coupons_affiliate_id ON public.coupons(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_order_id ON public.order_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_history_profile_id ON public.profile_change_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_history_changed_by ON public.profile_change_history(changed_by);
