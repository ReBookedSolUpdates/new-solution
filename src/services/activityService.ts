import { supabase } from "@/integrations/supabase/client";
import debugLogger from "@/utils/debugLogger";
import { DeviceMetadataUtils } from "@/utils/deviceMetadataUtils";

// Define comprehensive activity types
export type ActivityType =
  | "login"
  | "logout"
  | "signup"
  | "page_view"
  | "book_view"
  | "book_add_to_cart"
  | "book_remove_from_cart"
  | "share_mini_link"
  | "share_book_link"
  | "share_social_media"
  | "checkout_started"
  | "checkout_product_viewed"
  | "checkout_cart_viewed"
  | "checkout_payment_initiated"
  | "checkout_completed"
  | "checkout_abandoned"
  | "profile_updated"
  | "banking_updated"
  | "listing_created"
  | "listing_started"
  | "order_paid"
  | "order_committed"
  | "search_performed";

export type EntityType =
  | "authentication"
  | "page"
  | "book"
  | "order"
  | "referral"
  | "profile"
  | "banking"
  | "listing"
  | "cart"
  | "search";

export interface ActivityLogEntry {
  user_id?: string;
  action: ActivityType;
  entity_type: EntityType;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

const SESSION_STORAGE_KEY = "activity_session_id";
const ANON_ID_KEY = "rebooked_anonymous_id";

function getAnonymousId(): string {
  try {
    let anonId = localStorage.getItem(ANON_ID_KEY);
    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(ANON_ID_KEY, anonId);
    }
    return anonId;
  } catch {
    return `anon_runtime_${Date.now()}`;
  }
}

export class ActivityService {
  private static generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session_${timestamp}_${random}`;
  }

  static getSessionId(): string {
    try {
      let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionId) {
        sessionId = this.generateSessionId();
        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      }
      return sessionId;
    } catch (e) {
      return this.generateSessionId();
    }
  }

  static clearSessionId(): void {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {}
  }

  /**
   * Main method to log an activity - writes to both activity_logs and analytics_events
   */
  static async logActivity(
    action: ActivityType,
    entityType: EntityType,
    userId?: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sessionId = this.getSessionId();

      // Verify a live session exists before any authenticated insert.
      // During logout the session is torn down and inserts will 401 the RLS policy.
      let liveSession = null as any;
      try {
        const { data } = await supabase.auth.getSession();
        liveSession = data?.session ?? null;
      } catch (_) {
        liveSession = null;
      }

      // For anonymous users (or no live session): log to analytics_events only
      if (!userId || !liveSession) {
        const anonymousId = getAnonymousId();
        const deviceMeta = this.getDeviceMetaSafe();
        try {
          await supabase.from("analytics_events").insert([{
            event_name: action,
            event_category: this.getCategoryFromAction(action),
            entity_type: entityType,
            entity_id: entityId,
            user_id: null,
            session_id: sessionId,
            page_url: typeof window !== "undefined" ? window.location.pathname : "",
            referrer: typeof document !== "undefined" ? (document.referrer || null) : null,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
            browser: (deviceMeta.browser_name as string) || "Unknown",
            device_type: (deviceMeta.device_type as string) || "Unknown",
            platform: (deviceMeta.os as string) || "Unknown",
            metadata: { ...metadata, anonymous_id: anonymousId },
          }]);
        } catch (anonErr) {
          // Non-fatal
        }
        return { success: true };
      }

      // Write to activity_logs
      const activityLog: ActivityLogEntry = {
        action,
        entity_type: entityType,
        entity_id: entityId,
        user_id: userId,
        metadata: {
          session_id: sessionId,
          ...metadata,
        },
      };

      const cleanLog = Object.fromEntries(
        Object.entries(activityLog).filter(
          ([, v]) => v !== undefined && v !== null
        )
      );

      const { error } = await supabase
        .from("activity_logs")
        .insert([cleanLog]);

      if (error) {
        debugLogger.error("activityService", "Activity logging error:", {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
        });
      }

      // Also write to analytics_events for richer analytics
      const deviceMeta = this.getDeviceMetaSafe();
      const analyticsData = {
        event_name: action,
        event_category: this.getCategoryFromAction(action),
        entity_type: entityType || null,
        entity_id: entityId || null,
        user_id: userId || null,
        session_id: sessionId,
        page_url: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        browser: (deviceMeta.browser_name as string) || null,
        device_type: (deviceMeta.device_type as string) || null,
        platform: (deviceMeta.os as string) || null,
        metadata: metadata || {},
      };
      const { error: analyticsError } = await supabase.from("analytics_events").insert([analyticsData]);

      if (analyticsError) {
        debugLogger.error("activityService", "Analytics logging error:", {
          message: analyticsError.message,
          code: (analyticsError as any).code,
          details: (analyticsError as any).details,
        });
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLogger.error("activityService", "Exception during activity logging:", {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return { success: false, error: errorMessage };
    }
  }

  private static getDeviceMetaSafe(): Record<string, unknown> {
    try {
      return DeviceMetadataUtils.getDeviceMetadata();
    } catch {
      return {};
    }
  }

  private static getCategoryFromAction(action: ActivityType): string {
    if (action.startsWith("checkout")) return "conversion";
    if (action.startsWith("book_") || action === "listing_created" || action === "listing_started") return "engagement";
    if (action.startsWith("share_")) return "sharing";
    if (action === "page_view") return "navigation";
    if (action === "login" || action === "logout" || action === "signup") return "authentication";
    if (action === "search_performed") return "search";
    return "general";
  }

  // ==================== Authentication Events ====================

  static async trackLogin(userId: string): Promise<void> {
    await this.logActivity("login", "authentication", userId);
  }

  static async trackLogout(userId: string, sessionDurationMs?: number): Promise<void> {
    await this.logActivity("logout", "authentication", userId, undefined, {
      session_duration_ms: sessionDurationMs,
    });
    this.clearSessionId();
  }

  static async trackSignup(userId: string): Promise<void> {
    await this.logActivity("signup", "authentication", userId);
  }

  // ==================== Page Navigation ====================

  static async trackPageView(
    userId: string | undefined,
    pagePath: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logActivity("page_view", "page", userId, pagePath, {
      path: pagePath,
      referrer: document.referrer || undefined,
      ...metadata,
    });
  }

  // ==================== Book Interactions ====================

  static async trackBookView(
    bookId: string,
    userId: string | undefined,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logActivity("book_view", "book", userId, bookId, metadata);
  }

  static async trackBookPageTimeSpent(
    bookId: string,
    userId: string | undefined,
    timeSpentMs: number
  ): Promise<void> {
    await this.logActivity("book_view", "book", userId, bookId, {
      time_spent_ms: timeSpentMs,
      event_subtype: "time_spent",
    });
  }

  static async trackAddToCart(
    bookId: string,
    userId: string | undefined,
    quantity: number = 1,
    price?: number
  ): Promise<void> {
    await this.logActivity("book_add_to_cart", "cart", userId, bookId, {
      quantity,
      price,
    });
  }

  static async trackRemoveFromCart(
    bookId: string,
    userId: string | undefined,
    quantity: number = 1
  ): Promise<void> {
    await this.logActivity("book_remove_from_cart", "cart", userId, bookId, {
      quantity,
    });
  }

  // ==================== Search Tracking ====================

  static async trackSearch(
    userId: string | undefined,
    query: string,
    resultCount: number,
    filters?: Record<string, unknown>
  ): Promise<void> {
    await this.logActivity("search_performed", "search", userId, undefined, {
      search_query: query,
      result_count: resultCount,
      ...filters,
    });
  }

  // ==================== Share & Referral Tracking ====================

  static async trackMiniLinkShare(
    miniLinkId: string,
    userId: string | undefined,
    platform?: string
  ): Promise<void> {
    await this.logActivity("share_mini_link", "referral", userId, miniLinkId, {
      platform,
    });
  }

  static async trackBookShare(
    bookId: string,
    userId: string | undefined,
    platform?: string
  ): Promise<void> {
    await this.logActivity("share_book_link", "referral", userId, bookId, {
      platform,
    });
  }

  static async trackSocialShare(
    entityId: string,
    userId: string | undefined,
    platform: string
  ): Promise<void> {
    await this.logActivity("share_social_media", "referral", userId, entityId, {
      platform,
    });
  }

  static async trackReferralVisit(
    referralCode: string,
    userId: string | undefined
  ): Promise<void> {
    await this.logActivity("page_view", "referral", userId, referralCode, {
      referral_code: referralCode,
    });
  }

  // ==================== Listing Creation Tracking ====================

  static async trackListingStarted(
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logActivity("listing_started", "listing", userId, undefined, {
      started_at: Date.now(),
      ...metadata,
    });
  }

  static async trackListingCreated(
    userId: string,
    listingId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logActivity("listing_created", "listing", userId, listingId, metadata);
  }

  // ==================== Checkout Funnel ====================

  static async trackCheckoutStarted(
    userId: string | undefined,
    cartValue?: number,
    itemCount?: number
  ): Promise<void> {
    await this.logActivity("checkout_started", "order", userId, undefined, {
      cart_value: cartValue,
      item_count: itemCount,
    });
  }

  static async trackCheckoutStep(
    userId: string | undefined,
    step: "cart_viewed" | "payment_initiated" | "product_viewed",
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const actionMap = {
      cart_viewed: "checkout_cart_viewed",
      payment_initiated: "checkout_payment_initiated",
      product_viewed: "checkout_product_viewed",
    } as const;

    await this.logActivity(
      actionMap[step],
      "order",
      userId,
      undefined,
      metadata
    );
  }

  static async trackPurchase(
    userId: string | undefined,
    orderId: string,
    orderValue: number,
    itemCount: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logActivity("checkout_completed", "order", userId, orderId, {
      order_value: orderValue,
      item_count: itemCount,
      ...metadata,
    });
  }

  static async trackCheckoutAbandoned(
    userId: string | undefined,
    lastStep?: string,
    cartValue?: number
  ): Promise<void> {
    await this.logActivity(
      "checkout_abandoned",
      "order",
      userId,
      undefined,
      {
        last_step: lastStep,
        cart_value: cartValue,
      }
    );
  }

  // ==================== Profile & Account ====================

  static async trackProfileUpdate(
    userId: string,
    updateType?: string
  ): Promise<void> {
    await this.logActivity("profile_updated", "profile", userId, undefined, {
      update_type: updateType,
    });
  }

  static async trackBankingUpdate(
    userId: string,
    isUpdate: boolean = true
  ): Promise<void> {
    await this.logActivity("banking_updated", "banking", userId, undefined, {
      action: isUpdate ? "update" : "create",
    });
  }

  // Legacy aliases
  static async logProfileUpdate(userId: string): Promise<void> {
    await this.trackProfileUpdate(userId);
  }

  static async logBankingUpdate(userId: string, isUpdate: boolean = true): Promise<void> {
    await this.trackBankingUpdate(userId, isUpdate);
  }

  static async trackOrderPaid(
    userId: string,
    orderId: string,
    amount: number
  ): Promise<void> {
    await this.logActivity("order_paid", "order", userId, orderId, {
      amount,
    });
  }

  static async trackOrderCommitted(
    userId: string,
    orderId: string
  ): Promise<void> {
    await this.logActivity("order_committed", "order", userId, orderId);
  }

  // ==================== Analytics & Reporting ====================

  static async getUserActivities(
    userId: string,
    limit: number = 50,
    action?: ActivityType
  ): Promise<any[]> {
    try {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (action) {
        query = query.eq("action", action);
      }

      const { data, error } = await query;

      if (error) {
        debugLogger.error("activityService", "Error fetching user activities:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      debugLogger.error("activityService", "Exception fetching user activities:", error);
      return [];
    }
  }

  static async getUserAnalytics(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("action, entity_type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        debugLogger.error("activityService", "Error fetching user analytics:", error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const actionCounts: Record<string, number> = {};
      const entityCounts: Record<string, number> = {};
      
      data.forEach((log) => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        entityCounts[log.entity_type] = (entityCounts[log.entity_type] || 0) + 1;
      });

      return {
        total_events: data.length,
        action_counts: actionCounts,
        entity_counts: entityCounts,
        first_activity: data[data.length - 1]?.created_at,
        last_activity: data[0]?.created_at,
      };
    } catch (error) {
      debugLogger.error("activityService", "Exception calculating user analytics:", error);
      return null;
    }
  }

  /**
   * Get platform-wide analytics from analytics_events table
   */
  static async getPlatformAnalytics(): Promise<{
    topViewedBooks: any[];
    topPages: any[];
    checkoutConversion: { started: number; completed: number; rate: number };
  } | null> {
    try {
      // Top viewed books
      const { data: bookViews } = await supabase
        .from("analytics_events")
        .select("entity_id, metadata")
        .eq("event_name", "book_view")
        .eq("entity_type", "book")
        .order("created_at", { ascending: false })
        .limit(1000);

      // Top pages
      const { data: pageViews } = await supabase
        .from("analytics_events")
        .select("page_url, metadata")
        .eq("event_name", "page_view")
        .order("created_at", { ascending: false })
        .limit(1000);

      // Checkout funnel
      const { count: checkoutStarted } = await supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "checkout_started");

      const { count: checkoutCompleted } = await supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "checkout_completed");

      // Aggregate book views
      const bookViewCounts: Record<string, number> = {};
      bookViews?.forEach(bv => {
        if (bv.entity_id) {
          bookViewCounts[bv.entity_id] = (bookViewCounts[bv.entity_id] || 0) + 1;
        }
      });
      const topViewedBooks = Object.entries(bookViewCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([id, count]) => ({ book_id: id, view_count: count }));

      // Aggregate page views
      const pageViewCounts: Record<string, number> = {};
      pageViews?.forEach(pv => {
        if (pv.page_url) {
          pageViewCounts[pv.page_url] = (pageViewCounts[pv.page_url] || 0) + 1;
        }
      });
      const topPages = Object.entries(pageViewCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([url, count]) => ({ page_url: url, view_count: count }));

      const started = checkoutStarted || 0;
      const completed = checkoutCompleted || 0;

      return {
        topViewedBooks,
        topPages,
        checkoutConversion: {
          started,
          completed,
          rate: started > 0 ? (completed / started) * 100 : 0,
        },
      };
    } catch (error) {
      debugLogger.error("activityService", "Error fetching platform analytics:", error);
      return null;
    }
  }
}
