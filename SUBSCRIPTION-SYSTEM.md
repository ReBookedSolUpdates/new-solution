# ReBooked Genius Subscription System (Paystack Integration)

This document provides a comprehensive end-to-end technical overview of the subscription system for ReBooked Genius. It describes how subscriptions are initialized, managed, verified, and handled through automated processes (webhooks, cron checks) and user-facing frontend UI.

---

## 1. Overview

ReBooked Genius offers a business model with two tiers that govern commission structures and feature availability:

1. **ReBooked Business Free** (Default / Fallback)
   * **Pricing**: R0.00 / month.
   * **Unlocked Benefits**: Basic selling capabilities on the platform.
   * **Transaction Commission**: Flat **10%** commission on sales (seller retains 90.0% of the sale).

2. **ReBooked Business Tier 1** (Paid)
   * **Pricing**: R79.00 / month.
   * **Unlocked Benefits**:
     * Locked **6.5%** commission rate on sales (seller retains 93.5% of the sale).
     * Public contact details displayed directly on the seller's mini-store card (Phone, Instagram handle, and Email).
     * Bulk store-wide promotions and category-based discount deals.
     * Restock & republish existing listings (stock additions without recreating listings).
     * Automated responder message setup for new incoming chats.

---

## 2. Signup Flow

When a user upgrades to **ReBooked Business Tier 1**, the following steps occur:

1. **Initiation**: 
   * The user clicks "Upgrade Now" on the frontend `SettingsTab.tsx`. This triggers `handleUpgradeSubscription` in [BusinessProfile.tsx](file:///C:/Users/simel/new-solution-2/src/pages/BusinessProfile.tsx), invoking the `paystack-subscription-checkout` edge function with the user's email.
2. **Paystack Checkout Initialization** (`paystack-subscription-checkout`):
   * Authenticates the user session via Supabase JWT Auth.
   * Selects the correct Paystack Plan Code:
     * Sandbox: reads `PAYSTACK_PLAN_CODE_SANDBOX` (falling back to `PAYSTACK_PLAN_CODE`).
     * Production: reads `PAYSTACK_PLAN_CODE`.
   * Sends a `POST` request to `https://api.paystack.co/transaction/initialize` with:
     * `email`
     * `amount: 7900` (R79.00 in ZAR cents)
     * `plan: Plan Code`
     * `callback_url: https://rebookedsolutions.co.za/business-profile?tab=settings_payouts`
     * `metadata.user_id: user.id`
   * Returns `authorization_url` to the frontend, which redirects the user to Paystack's hosted payment gateway.
3. **Webhook Processing** (`paystack-webhook`):
   * Upon successful authorization, Paystack sends a `charge.success` or `subscription.create` event payload.
   * Signature validation checks that the payload matches `x-paystack-signature` using HMAC SHA512.
   * User ID resolution follows a three-step fallback path:
     1. `metadata.user_id` from the payload.
     2. Profiles database lookup via customer email (`eventData.customer.email`).
     3. Business subscriptions lookup using the Paystack Customer Code or Subscription Code.
   * **Database Writes**:
     * Upserts into `public.business_subscriptions` setting `tier = 'tier1'`, `status = 'active'`, dates, and clearing grace columns (`payment_failed_at`, `grace_period_end`, `grace_reminders_sent`, `recovery_reference`).
     * Updates `public.profiles` table: sets `subscription_tier = 'tier1'` and `subscription_active_until = currentPeriodEnd`.
4. **Email Notification**:
   * Invokes the `send-email` edge function to deliver `buildBusinessSubscriptionActivatedEmail` to the user's email.

---

## 3. Active Subscription Lifecycle

The state of a subscription is tracked across two primary locations:

### Database Representation
* **`public.business_subscriptions` table**:
  * `tier` (`TEXT`): Can be `'free'` or `'tier1'`.
  * `status` (`TEXT`): Can be `'active'`, `'past_due'`, `'cancelled'`, or `'unpaid'`.
  * `paystack_subscription_code` (`TEXT`): Unique code identifying the subscription in Paystack.
  * `paystack_customer_code` (`TEXT`): Unique customer reference code.
  * `current_period_start` / `current_period_end` (`TIMESTAMPTZ`): Billing period timestamps.
  * `cancel_at_period_end` (`BOOLEAN`): Set to `TRUE` if user requested voluntary cancellation before the next billing cycle.
* **`public.profiles` table**:
  * `subscription_tier` (`TEXT`): Syncs to `'free'` or `'tier1'`.
  * `subscription_active_until` (`TIMESTAMPTZ`): Period expiration date.
  * `subscription_test_mode` (`BOOLEAN`): If `TRUE`, overrides validation (Tier 1 features remain active regardless of database status; typically set to false for production).

### Frontend Verification
* Page-load checks retrieve this data via the shared service `checkLiveSubscription(businessId)` in [subscriptionService.ts](file:///C:/Users/simel/new-solution-2/src/services/subscriptionService.ts).
* Returns structured state variables: `isTier1` (boolean status validating whether active or within grace period), `status`, `cancelAtPeriodEnd`, and `currentPeriodEnd`.

---

## 4. Renewal Flow

Renewals are driven entirely asynchronously by Paystack's automated billing cycles:

1. **Renewal Event**:
   * Paystack attempts to charge the card on file at the expected charge date.
   * If successful, Paystack fires a `charge.success` webhook event.
2. **Re-Upsert Logic**:
   * `paystack-webhook` parses the event and clamps renewal dates (if the renewal day of the month is > 28, it gets clamped to the 28th to prevent billing drift on months with 28/29/30 days).
   * Updates `business_subscriptions` and `profiles` with the new period boundaries.
3. **Frontend Re-Verification**:
   * The user is notified on page load. In `BusinessProfile.tsx`, the `?reference=` parameter in the query string is processed via the `paystack-verify-subscription` edge function, triggering a successful verification toast.
   * **"Subscription renewed" Modal / UI Trigger**: *[UNCLEAR — needs verification]*: No dedicated subscription renewed modal was found in the frontend source code. The application currently relies on a success notification toast (`toast.success`) to notify users of successful validation when a reference is returned in the URL query string.

---

## 5. Missed/Failed Payment Flow

Because Paystack does not automatically retry failed charges or support schedule-driven webhooks, ReBooked Genius employs a hybrid webhook & polling architecture:

1. **Immediate Webhook Trigger**:
   * If a charge fails during renewal, Paystack emits `invoice.payment_failed`.
   * The webhook captures this, updating the local DB `status` to `'past_due'` and starting the **3-day grace period**.
2. **Scheduled Verification Polling** (`paystack-check-subscriptions` edge function):
   * Runs hourly via pg_cron (`2 * * * *` - 2 minutes past the hour to prevent race conditions with Paystack's billing processor).
   * **Phase 1 (Missed Payment Detection)**: Queries active subscriptions whose `current_period_end` has passed but status remains `'active'`. It calls Paystack `GET /subscription/:code` to verify the actual state.
     * If Paystack indicates the status is no longer active, the cron changes the local status to `'past_due'`, records `payment_failed_at = now()`, sets `grace_period_end = now() + 3 days`, and sends a **Day 1 Grace Email** (`buildGracePeriodDay1Email`).
   * **Phase 2 (Dunning Window Management)**:
     * Over the course of the 3-day dunning/grace window, it tracks `grace_reminders_sent`.
     * Day 1: Sends `buildGracePeriodDay1Email` (warning, R79 recovery options, update card).
     * Day 2: Sends `buildGracePeriodDay2Email`.
     * Day 3: Sends `buildGracePeriodFinalWarningEmail` (final warning of end-of-day cancellation).
3. **Grace Period Expiry**:
   * If the grace period is unresolved by the end of Day 3, `cancelSubscription` is invoked.
   * It disables the subscription on Paystack using `/subscription/disable` (requiring subscription code and email token).
   * Downgrades local database records to `'free'` tier and sets `status = 'cancelled'`.
   * Fires the downgrade email (`buildBusinessDowngradedEmail`).

---

## 6. Cancellation Flow

Subscriptions support both voluntary (self-serve) and involuntary (system-driven) cancellation pathways:

1. **Self-Serve (Voluntary) Cancellation**:
   * Located in account settings on `SettingsTab.tsx`. The user clicks "Cancel Plan", which triggers `handleCancelSubscription` in `BusinessProfile.tsx` after confirmation.
   * Calls the `paystack-subscription-cancel` edge function.
   * The function fetches the subscription details from Paystack to retrieve the customer's unique `email_token`.
   * Sends a `POST` request to `https://api.paystack.co/subscription/disable` with `code` and `token`.
   * Sets `cancel_at_period_end = TRUE` locally.
2. **Voluntary Cancellation Behavior**:
   * The user retains Tier 1 access (and the 6.5% commission rate) until `current_period_end` is reached.
   * At the end of the period, Paystack emits `subscription.disable` (since it was deactivated), which downgrades the account locally to `'free'` and revokes access.
3. **Refund Policy**:
   * *[UNCLEAR — needs verification]*: No refund calculation logic, credit ledger updates, or refund triggers exist in the subscription checkout or cancellation endpoints. Refund behaviors appear to be handled manually or are not supported.

---

## 7. Webhook Handling

The webhook handler endpoint [paystack-webhook/index.ts](file:///C:/Users/simel/new-solution-2/supabase/functions/paystack-webhook/index.ts) processes events emitted by Paystack:

| Webhook Event | System Processing Action |
|---|---|
| `subscription.create` | Resolves the user; Upserts the subscription row as `'active'` `'tier1'`; Sets period start and end; Clears grace period fields; Updates profiles table; Fires activation email. |
| `charge.success` | Checks if it's a one-off payment (`metadata.type === 'subscription_recovery'`). If recovery: reinstates subscription to active tier 1 and clears grace counters. If standard: processes subscription period updates/activation (same as `subscription.create`). |
| `invoice.payment_failed` | Transitions subscription state to `'past_due'`; Calculates `grace_period_end` (3 days from now); Sets `grace_reminders_sent = 1`; Fires payment failed notification email. |
| `subscription.not_renew` | Triggered when a plan is marked non-renewing; Updates `cancel_at_period_end = TRUE` in the local DB; Fires cancellation notice email. |
| `subscription.disable` | Called when the subscription is disabled; Updates DB subscription to `'cancelled'` and tier to `'free'`; Updates user profile to `'free'` tier and removes active timestamp; Fires downgrade email. |

### Idempotency Handling
* *[UNCLEAR — needs verification]*: The webhook endpoint contains no direct database constraints or idempotency checks on transactions. It performs immediate database upserts and triggers emails every time an event is received, presenting potential duplicate triggers.

---

## 8. Edge Cases

1. **Re-subscribing Mid-Dunning**:
   * If a user triggers a standard checkout or recovery checkout while their status is `'past_due'`, a successful payment webhook (`charge.success`) resets `status = 'active'`, clears `payment_failed_at`, `grace_period_end`, `grace_reminders_sent`, and reinstates full Tier 1 active status.
2. **Duplicate Webhook Events**:
   * Paystack occasionally retries webhook deliveries. Because there is no check for duplicate events (e.g., matching transactions against a processed log), processing multiple identical `charge.success` events will trigger multiple duplicate emails to the seller.
3. **No Plan Code Sandbox Suffix**:
   * The plan configuration selects variables named `PAYSTACK_PLAN_CODE` or `PAYSTACK_PLAN_CODE_SANDBOX`. The environment is determined dynamically by verifying if `PAYSTACK_SECRET_KEY` starts with `'sk_test_'`.
4. **Upgrade/Downgrade Pathing**:
   * System only supports transitioning directly between `'free'` and `'tier1'`. No multi-tier pricing plans exist.

---

## 9. Relevant DB Schema

### `public.business_subscriptions`
Stores subscription records and tracks lifecycle transitions.

```sql
CREATE TABLE public.business_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'tier1')),
    status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid')),
    paystack_subscription_code TEXT,
    paystack_customer_code TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    payment_failed_at TIMESTAMPTZ,
    grace_period_end TIMESTAMPTZ,
    grace_reminders_sent INTEGER DEFAULT 0,
    recovery_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `public.profiles`
Key columns mapped to subscriptions:
* `subscription_tier` (`TEXT`): Can be `'free'` or `'tier1'`.
* `subscription_active_until` (`TIMESTAMPTZ`): Time until subscription is valid.
* `subscription_test_mode` (`BOOLEAN`): Overrides subscription checks when `TRUE`.

---

## ⚠️ Issues & Recommendations

### 1. Lack of Webhook Idempotency (High Risk)
* **Problem**: The `paystack-webhook` does not verify if a transaction reference or webhook delivery ID has been processed previously. If Paystack duplicates a webhook payload, the function will execute database writes and send multiple redundant emails to the client.
* **Fix**: Create a `processed_webhooks` ledger table, record the unique `id` or event reference from Paystack, and return a fast `200 OK` response if the entry exists.

### 2. Missing RLS policies for database inserts on Webhook triggers (Medium Risk)
* **Problem**: While service roles bypass RLS, `paystack-webhook` relies on `SUPABASE_SERVICE_ROLE_KEY` to update records. However, RLS policies for `business_subscriptions` only allow selects by `auth.uid() = business_id` or Admins. Any accidental use of anon/authenticated client permissions on backend queries will block updates.
* **Fix**: Ensure that all subscription updates originate securely through Deno edge functions using the service role client and restrict local user modifications.

### 3. Verification drift in `get_seller_payout_rate` (Low Risk)
* **Problem**: The database function `get_seller_payout_rate` evaluates if the seller is in a grace period by calculating `v_active_until + INTERVAL '3 days' >= now()`. However, the cron script uses `grace_period_end` (which is stored in the DB as `now() + 3 days` at the time of check/failure notification). If the check is delayed or run at a different interval, the payout rate check and grace cancellation date will drift.
* **Fix**: Align `get_seller_payout_rate` to evaluate the actual stored column `grace_period_end` directly from the `business_subscriptions` table rather than recalculating the interval on the fly.
