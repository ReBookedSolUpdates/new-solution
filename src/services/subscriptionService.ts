import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStatus {
  isTier1: boolean;
  status: "active" | "past_due" | "cancelled" | "unpaid" | "free";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export async function checkLiveSubscription(businessId: string): Promise<SubscriptionStatus> {
  const FREE_STATUS: SubscriptionStatus = {
    isTier1: false,
    status: "free",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };

  try {
    // 1. Fetch profile to confirm business account and get profile-level tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, is_business")
      .eq("id", businessId)
      .maybeSingle();

    if (!profile || !profile.is_business) {
      return FREE_STATUS;
    }

    // 2. Query the live business_subscriptions table for authoritative status
    // Note: business_subscriptions is not in generated types yet, so we cast
    const { data: subscription } = await supabase
      .from("business_subscriptions" as any)
      .select("tier, status, current_period_end, cancel_at_period_end")
      .eq("business_id", businessId)
      .maybeSingle();

    if (subscription) {
      const currentPeriodEnd = subscription.current_period_end;
      const isPastDue = subscription.status === "past_due";
      const isActive = subscription.status === "active";

      // Grace period check for past_due (allow 3 days after period end)
      const withinGracePeriod = isPastDue && currentPeriodEnd
        ? new Date(currentPeriodEnd).getTime() + 3 * 24 * 60 * 60 * 1000 >= Date.now()
        : false;

      const hasAccess = subscription.tier === "tier1" && (isActive || withinGracePeriod);

      return {
        isTier1: hasAccess,
        status: subscription.status as SubscriptionStatus["status"],
        cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        currentPeriodEnd: currentPeriodEnd,
      };
    }

    // 3. Fallback: profile-level tier (for promo-code granted access without a subscription row)
    if (profile.subscription_tier === "tier1") {
      return {
        isTier1: true,
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      };
    }

    return FREE_STATUS;

  } catch (error) {
    console.error("Error checking subscription:", error);
    return FREE_STATUS;
  }
}
