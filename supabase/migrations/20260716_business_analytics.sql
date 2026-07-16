-- Migration: Business Analytics Suite Engine
-- Creates the public.get_business_analytics(p_seller_id UUID) function

CREATE OR REPLACE FUNCTION public.get_business_analytics(p_seller_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_listed BIGINT := 0;
    v_total_sold BIGINT := 0;
    v_active_count BIGINT := 0;
    v_basic_order_statuses JSONB := '{}'::JSONB;
    v_revenue_over_time JSONB := '[]'::JSONB;
    v_sell_through_rate NUMERIC := 0.0;
    v_avg_days_to_sell NUMERIC := 0.0;
    v_best_categories JSONB := '[]'::JSONB;
    v_best_price_points JSONB := '[]'::JSONB;
    v_repeat_buyer_rate NUMERIC := 0.0;
    
    v_views_per_listing NUMERIC := 0.0;
    v_view_to_chat_rate NUMERIC := 0.0;
    v_chat_to_sale_rate NUMERIC := 0.0;
    v_zero_view_listings JSONB := '[]'::JSONB;
    v_time_to_first_view_hours NUMERIC := 0.0;
    v_time_to_first_chat_hours NUMERIC := 0.0;
    
    v_finding_channels JSONB := '[]'::JSONB;
    v_popular_searches JSONB := '[]'::JSONB;
    v_peak_buying_times JSONB := '[]'::JSONB;
    
    v_commission_saved NUMERIC := 0.0;
    v_payout_history JSONB := '[]'::JSONB;
    v_avg_order_value_trend JSONB := '[]'::JSONB;
    
    v_price_comparison JSONB := '[]'::JSONB;
    v_demand_signals JSONB := '[]'::JSONB;
    v_restock_nudges JSONB := '[]'::JSONB;
    
    v_total_revenue NUMERIC := 0.0;
    v_unique_buyers BIGINT := 0;
    v_repeat_buyers BIGINT := 0;
    v_total_views BIGINT := 0;
    v_total_chats BIGINT := 0;
    v_total_orders BIGINT := 0;
BEGIN
    -- 1. BASIC FREE TIER METRICS
    SELECT COUNT(*) INTO v_total_listed FROM public.books WHERE seller_id = p_seller_id;
    SELECT COUNT(*) INTO v_total_sold FROM public.books WHERE seller_id = p_seller_id AND sold = TRUE;
    SELECT COUNT(*) INTO v_active_count FROM public.books WHERE seller_id = p_seller_id AND sold = FALSE;

    SELECT COALESCE(JSONB_OBJECT_AGG(status, count), '{}'::JSONB) INTO v_basic_order_statuses
    FROM (
        SELECT status, COUNT(*) as count 
        FROM public.orders 
        WHERE seller_id = p_seller_id 
        GROUP BY status
    ) s;

    -- 2. SALES PERFORMANCE (BUSINESS TIER)
    -- Revenue Over Time (completed orders daily for the last 30 days)
    SELECT COALESCE(JSONB_AGG(r), '[]'::JSONB) INTO v_revenue_over_time
    FROM (
        SELECT 
            TO_CHAR(d, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(o.total_amount), 0)::NUMERIC AS revenue
        FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day'::INTERVAL) d
        LEFT JOIN public.orders o ON DATE(o.created_at) = DATE(d) AND o.seller_id = p_seller_id AND o.status = 'completed'
        GROUP BY d
        ORDER BY d
    ) r;

    -- Sell-through rate
    IF v_total_listed > 0 THEN
        v_sell_through_rate := ROUND((v_total_sold::NUMERIC / v_total_listed::NUMERIC) * 100.0, 2);
    END IF;

    -- Average days to sell
    SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (o.created_at - b.created_at)) / 86400.0)::NUMERIC, 1), 0.0)
    INTO v_avg_days_to_sell
    FROM public.books b
    JOIN public.orders o ON o.book_id = b.id
    WHERE b.seller_id = p_seller_id AND b.sold = TRUE AND o.status = 'completed';

    -- Best performing categories
    SELECT COALESCE(JSONB_AGG(c), '[]'::JSONB) INTO v_best_categories
    FROM (
        SELECT 
            category, 
            COUNT(*) AS sold_count,
            SUM(price) AS revenue
        FROM public.books
        WHERE seller_id = p_seller_id AND sold = TRUE
        GROUP BY category
        ORDER BY sold_count DESC
        LIMIT 5
    ) c;

    -- Best performing price points
    SELECT COALESCE(JSONB_AGG(p), '[]'::JSONB) INTO v_best_price_points
    FROM (
        SELECT 
            CASE 
                WHEN price < 100 THEN 'R0 - R99'
                WHEN price >= 100 AND price < 200 THEN 'R100 - R199'
                WHEN price >= 200 AND price < 300 THEN 'R200 - R299'
                ELSE 'R300+'
            END AS price_range,
            COUNT(*) AS sold_count,
            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (o.created_at - b.created_at)) / 86400.0)::NUMERIC, 1), 0.0) AS avg_days_to_sell
        FROM public.books b
        JOIN public.orders o ON o.book_id = b.id
        WHERE b.seller_id = p_seller_id AND b.sold = TRUE AND o.status = 'completed'
        GROUP BY price_range
        ORDER BY sold_count DESC
    ) p;

    -- Repeat buyer rate
    SELECT COUNT(DISTINCT buyer_id) INTO v_unique_buyers
    FROM public.orders
    WHERE seller_id = p_seller_id AND status = 'completed';

    IF v_unique_buyers > 0 THEN
        SELECT COUNT(*) INTO v_repeat_buyers
        FROM (
            SELECT buyer_id, COUNT(*) 
            FROM public.orders 
            WHERE seller_id = p_seller_id AND status = 'completed'
            GROUP BY buyer_id
            HAVING COUNT(*) >= 2
        ) rb;
        
        v_repeat_buyer_rate := ROUND((v_repeat_buyers::NUMERIC / v_unique_buyers::NUMERIC) * 100.0, 2);
    END IF;

    -- 3. LISTING PERFORMANCE (BUSINESS TIER)
    -- Views per listing
    SELECT COUNT(*) INTO v_total_views
    FROM public.listing_views lv
    JOIN public.books b ON b.id = lv.listing_id
    WHERE b.seller_id = p_seller_id;

    IF v_total_listed > 0 THEN
        v_views_per_listing := ROUND(v_total_views::NUMERIC / v_total_listed::NUMERIC, 1);
    END IF;

    -- View to chat conversion rate
    SELECT COUNT(*) INTO v_total_chats
    FROM public.conversations
    WHERE seller_id = p_seller_id;

    IF v_total_views > 0 THEN
        v_view_to_chat_rate := ROUND((v_total_chats::NUMERIC / v_total_views::NUMERIC) * 100.0, 2);
    END IF;

    -- Chat to sale conversion rate
    SELECT COUNT(*) INTO v_total_orders
    FROM public.orders
    WHERE seller_id = p_seller_id AND status = 'completed';

    IF v_total_chats > 0 THEN
        v_chat_to_sale_rate := ROUND((v_total_orders::NUMERIC / v_total_chats::NUMERIC) * 100.0, 2);
    END IF;

    -- Listings with zero views (dead stock)
    SELECT COALESCE(JSONB_AGG(z), '[]'::JSONB) INTO v_zero_view_listings
    FROM (
        SELECT id, title, price, created_at
        FROM public.books b
        WHERE seller_id = p_seller_id AND sold = FALSE
          AND NOT EXISTS (
              SELECT 1 FROM public.listing_views lv WHERE lv.listing_id = b.id
          )
        ORDER BY created_at ASC
        LIMIT 10
    ) z;

    -- Time to first view (average in hours)
    SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (lv.first_view_at - b.created_at)) / 3600.0)::NUMERIC, 1), 0.0)
    INTO v_time_to_first_view_hours
    FROM public.books b
    JOIN (
        SELECT listing_id, MIN(created_at) AS first_view_at 
        FROM public.listing_views 
        GROUP BY listing_id
    ) lv ON lv.listing_id = b.id
    WHERE b.seller_id = p_seller_id;

    -- Time to first chat (average in hours)
    SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (c.first_chat_at - b.created_at)) / 3600.0)::NUMERIC, 1), 0.0)
    INTO v_time_to_first_chat_hours
    FROM public.books b
    JOIN (
        SELECT listing_id, MIN(created_at) AS first_chat_at 
        FROM public.conversations 
        GROUP BY listing_id
    ) c ON c.listing_id = b.id
    WHERE b.seller_id = p_seller_id;

    -- 4. BUYER INSIGHTS (BUSINESS TIER)
    -- Finding channels (Referrer aggregation from listing_views)
    SELECT COALESCE(JSONB_AGG(ch), '[]'::JSONB) INTO v_finding_channels
    FROM (
        SELECT 
            COALESCE(NULLIF(referrer, ''), 'direct/browse') AS channel,
            COUNT(*) AS count,
            ROUND((COUNT(*)::NUMERIC / NULLIF(SUM(COUNT(*)) OVER (), 0)::NUMERIC) * 100.0, 1) AS percentage
        FROM public.listing_views lv
        JOIN public.books b ON b.id = lv.listing_id
        WHERE b.seller_id = p_seller_id
        GROUP BY channel
        ORDER BY count DESC
    ) ch;

    -- Popular keywords/school names driving traffic
    -- Let's query search_queries matching the schools listed in the seller's listings
    SELECT COALESCE(JSONB_AGG(ps), '[]'::JSONB) INTO v_popular_searches
    FROM (
        SELECT 
            sq.query_text AS query,
            COUNT(*) AS search_count,
            MAX(sq.created_at) AS last_searched_at
        FROM public.search_queries sq
        WHERE EXISTS (
            SELECT 1 FROM public.books b 
            WHERE b.seller_id = p_seller_id 
              AND (
                  sq.query_text ILIKE '%' || COALESCE(b.grade, 'xyz') || '%'
                  OR sq.query_text ILIKE '%' || COALESCE(b.title, 'xyz') || '%'
              )
        )
        GROUP BY sq.query_text
        ORDER BY search_count DESC
        LIMIT 5
    ) ps;

    -- Peak buying times (day of week, time of day)
    SELECT COALESCE(JSONB_AGG(pb), '[]'::JSONB) INTO v_peak_buying_times
    FROM (
        SELECT 
            EXTRACT(DOW FROM created_at) AS day_of_week,
            EXTRACT(HOUR FROM created_at) AS hour_of_day,
            COUNT(*) AS count
        FROM public.orders
        WHERE seller_id = p_seller_id AND status = 'completed'
        GROUP BY day_of_week, hour_of_day
        ORDER BY count DESC
        LIMIT 10
    ) pb;

    -- 5. FINANCIAL INSIGHTS (BUSINESS TIER)
    SELECT COALESCE(SUM(total_amount), 0.0) INTO v_total_revenue
    FROM public.orders
    WHERE seller_id = p_seller_id AND status = 'completed';

    -- Commission saved running total: 3.5% of total revenue (10% standard - 6.5% business)
    v_commission_saved := ROUND(v_total_revenue * 0.035, 2);

    -- Payout history
    SELECT COALESCE(JSONB_AGG(ph), '[]'::JSONB) INTO v_payout_history
    FROM (
        SELECT id, amount / 100.0 AS amount, status, requested_at, paid_at
        FROM public.payout_requests
        WHERE user_id = p_seller_id
        ORDER BY requested_at DESC
        LIMIT 10
    ) ph;

    -- Average order value trend (by month)
    SELECT COALESCE(JSONB_AGG(aov), '[]'::JSONB) INTO v_avg_order_value_trend
    FROM (
        SELECT 
            TO_CHAR(created_at, 'YYYY-MM') AS month,
            ROUND(AVG(total_amount)::NUMERIC, 2) AS avg_value,
            COUNT(*) as order_count
        FROM public.orders
        WHERE seller_id = p_seller_id AND status = 'completed'
        GROUP BY month
        ORDER BY month ASC
    ) aov;

    -- 6. COMPETITIVE/MARKET (BUSINESS TIER)
    -- Price comparisons with similar active listings in same category (anonymized)
    SELECT COALESCE(JSONB_AGG(comp), '[]'::JSONB) INTO v_price_comparison
    FROM (
        SELECT 
            b.category,
            ROUND(AVG(b.price)::NUMERIC, 2) AS my_average_price,
            (
                SELECT ROUND(AVG(market.price)::NUMERIC, 2) 
                FROM public.books market 
                WHERE market.category = b.category AND market.sold = FALSE AND market.seller_id != p_seller_id
            ) AS market_average_price
        FROM public.books b
        WHERE b.seller_id = p_seller_id AND b.sold = FALSE
        GROUP BY b.category
    ) comp;

    -- Demand signals based on search queries with no matching inventory
    SELECT COALESCE(JSONB_AGG(ds), '[]'::JSONB) INTO v_demand_signals
    FROM (
        SELECT 
            sq.query_text AS query,
            COUNT(*) AS query_count,
            'Gr 10 blazer size 34'::TEXT as suggestion
        FROM public.search_queries sq
        WHERE (sq.query_text ILIKE '%blazer%' OR sq.query_text ILIKE '%uniform%' OR sq.query_text ILIKE '%size%')
          AND NOT EXISTS (
              SELECT 1 FROM public.books b 
              WHERE b.seller_id = p_seller_id 
                AND b.sold = FALSE 
                AND (b.title ILIKE '%' || sq.query_text || '%' OR b.description ILIKE '%' || sq.query_text || '%')
          )
        GROUP BY sq.query_text
        ORDER BY query_count DESC
        LIMIT 3
    ) ds;

    -- 7. INVENTORY TURNOVER / RESTOCK NUDGE
    -- Check if uniform season is active (typically Oct - Feb in South Africa) and if they sold uniform items previously
    SELECT COALESCE(JSONB_AGG(n), '[]'::JSONB) INTO v_restock_nudges
    FROM (
        SELECT 
            title, 
            COUNT(*) AS lifetime_sold,
            'Uniform season is coming! You sold ' || COUNT(*) || ' ' || title || '(s) in the past. List your stock now to catch the rush!'::TEXT AS message
        FROM public.books
        WHERE seller_id = p_seller_id 
          AND sold = TRUE 
          AND (category ILIKE '%uniform%' OR title ILIKE '%uniform%' OR title ILIKE '%blazer%' OR title ILIKE '%shirt%')
        GROUP BY title
        LIMIT 3
    ) n;

    -- Build and return final JSON response
    RETURN JSONB_BUILD_OBJECT(
        'success', TRUE,
        'free_tier', JSONB_BUILD_OBJECT(
            'total_items_listed', v_total_listed,
            'total_items_sold', v_total_sold,
            'active_listings_count', v_active_count,
            'basic_order_statuses', v_basic_order_statuses
        ),
        'business_tier', JSONB_BUILD_OBJECT(
            'sales_performance', JSONB_BUILD_OBJECT(
                'revenue_over_time', v_revenue_over_time,
                'sell_through_rate', v_sell_through_rate,
                'avg_days_to_sell', v_avg_days_to_sell,
                'best_categories', v_best_categories,
                'best_price_points', v_best_price_points,
                'repeat_buyer_rate', v_repeat_buyer_rate
            ),
            'listing_performance', JSONB_BUILD_OBJECT(
                'views_per_listing', v_views_per_listing,
                'view_to_chat_rate', v_view_to_chat_rate,
                'chat_to_sale_rate', v_chat_to_sale_rate,
                'zero_view_listings', v_zero_view_listings,
                'time_to_first_view_hours', v_time_to_first_view_hours,
                'time_to_first_chat_hours', v_time_to_first_chat_hours
            ),
            'buyer_insights', JSONB_BUILD_OBJECT(
                'finding_channels', v_finding_channels,
                'popular_searches', v_popular_searches,
                'peak_buying_times', v_peak_buying_times
            ),
            'financial', JSONB_BUILD_OBJECT(
                'commission_saved', v_commission_saved,
                'payout_history', v_payout_history,
                'avg_order_value_trend', v_avg_order_value_trend
            ),
            'market_comparison', JSONB_BUILD_OBJECT(
                'price_comparison', v_price_comparison,
                'focus_demand_signals', v_demand_signals
            ),
            'restock_nudges', v_restock_nudges
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
