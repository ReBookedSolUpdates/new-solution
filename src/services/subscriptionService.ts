import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStatus {
  isTier1: boolean;
  status: "active" | "past_due" | "cancelled" | "unpaid" | "free";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  testMode: boolean;
}

export async function checkLiveSubscription(businessId: string): Promise<SubscriptionStatus> {
  try {
    // 1. Fetch user's test mode flag from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_test_mode, is_business")
      .eq("id", businessId)
      .maybeSingle();

    if (!profile || !profile.is_business) {
      return {
        isTier1: false,
        status: "free",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        testMode: false
      };
    }

    // If test mode is enabled, user gets Tier 1 privileges automatically
    if (profile.subscription_test_mode) {
      return {
        isTier1: true,
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        testMode: true
      };
    }

    // 2. Query live subscriptions table
    const { data: subscription } = await supabase
      .from("business_subscriptions" as any)
      .select("tier, status, current_period_end, cancel_at_period_end")
      .eq("business_id", businessId)
      .maybeSingle();

    if (!subscription) {
      return {
        isTier1: false,
        status: "free",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        testMode: false
      };
    }

    const currentPeriodEnd = subscription.current_period_end;
    const isPastDue = subscription.status === "past_due";
    const isActive = subscription.status === "active";
    
    // Grace period check for past_due (allow 5 days)
    const withinGracePeriod = isPastDue && currentPeriodEnd 
      ? new Date(currentPeriodEnd).getTime() + 5 * 24 * 60 * 60 * 1000 >= Date.now()
      : false;

    const hasAccess = subscription.tier === "tier1" && (isActive || withinGracePeriod);

    return {
      isTier1: hasAccess,
      status: subscription.status as any,
      cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
      currentPeriodEnd: currentPeriodEnd,
      testMode: false
    };

  } catch (error) {
    console.error("Error checking subscription:", error);
    return {
      isTier1: false,
      status: "free",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      testMode: false
    };
  }
}
