import React, { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Building2,
  UploadCloud,
  Loader2,
  Instagram,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Info,
  BadgeCheck,
  Shield,
  Zap,
  AlertTriangle,
  RefreshCw,
  Clock,
  PartyPopper,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SettingsTabProps {
  user: any;
  profile: any;
  businessNameInput: string;
  setBusinessNameInput: (s: string) => void;
  instagramInput: string;
  setInstagramInput: (s: string) => void;
  phoneInput: string;
  setPhoneInput: (s: string) => void;
  avatarUrl: string;
  isUploadingPfp: boolean;
  handlePfpUpload: (f: File) => Promise<void>;
  showAddressInput: boolean;
  setShowAddressInput: (b: boolean) => void;
  showPhoneInput: boolean;
  setShowPhoneInput: (b: boolean) => void;
  autoCommit: boolean;
  setAutoCommit: (b: boolean) => void;
  autoResponderMsg: string;
  setAutoResponderMsg: (s: string) => void;
  savingSettings: boolean;
  handleSaveSettings: () => Promise<void>;
  savingAutoResponder: boolean;
  handleSaveAutoResponder: () => Promise<void>;
  subscriptionStatus: any;
  loadingSubscription: boolean;
  isInitiatingCheckout: boolean;
  handleUpgradeSubscription: () => Promise<void>;
  isCancelling: boolean;
  handleCancelSubscription: () => Promise<void>;
  redeemCode: string;
  setRedeemCode: (s: string) => void;
  isRedeeming: boolean;
  handleRedeemCode: () => Promise<void>;
  isTier1: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  user,
  profile,
  businessNameInput,
  setBusinessNameInput,
  instagramInput,
  setInstagramInput,
  phoneInput,
  setPhoneInput,
  avatarUrl,
  isUploadingPfp,
  handlePfpUpload,
  showAddressInput,
  setShowAddressInput,
  showPhoneInput,
  setShowPhoneInput,
  autoCommit,
  setAutoCommit,
  autoResponderMsg,
  setAutoResponderMsg,
  savingSettings,
  handleSaveSettings,
  savingAutoResponder,
  handleSaveAutoResponder,
  subscriptionStatus,
  loadingSubscription,
  isInitiatingCheckout,
  handleUpgradeSubscription,
  isCancelling,
  handleCancelSubscription,
  redeemCode,
  setRedeemCode,
  isRedeeming,
  handleRedeemCode,
  isTier1,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePfpUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Profile Logo & Info */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-bold text-gray-900 text-base">Store Profile Branding</h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-book-100 shadow-sm">
                <AvatarImage src={avatarUrl} alt="Store logo" className="object-cover" />
                <AvatarFallback className="bg-book-50 text-book-600 text-2xl font-bold">
                  <Building2 className="h-10 w-10 text-book-600" />
                </AvatarFallback>
              </Avatar>
              {isUploadingPfp && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-center sm:text-left">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPfp}
                className="rounded-xl border-gray-300 text-xs font-semibold"
              >
                <UploadCloud className="h-4 w-4 mr-2" /> Upload Business Logo
              </Button>
              <p className="text-[10px] text-gray-400">PNG, JPG or JPEG. Max 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Business Display Name</label>
              <Input
                value={businessNameInput}
                onChange={(e) => setBusinessNameInput(e.target.value)}
                placeholder="e.g. Campus Books Shop"
                className="rounded-xl border-gray-300"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Instagram className="h-4 w-4 text-gray-500" /> Instagram Handle
              </label>
              <Input
                value={instagramInput}
                onChange={(e) => setInstagramInput(e.target.value)}
                placeholder="@handle or URL"
                className="rounded-xl border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-gray-500" /> Phone Contact Number
              </label>
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. +27 82 123 4567"
                className="rounded-xl border-gray-300"
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Privacy & Display Toggles */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 text-sm">Public Info Display Toggles</h4>
            
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 last:border-0 last:pb-0">
              <div className="space-y-0.5 max-w-[80%]">
                <label className="text-xs font-bold text-gray-800">Display Store Address to Public</label>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Show your physical pick-up address/locker info on your public seller store page.
                </p>
              </div>
              <Switch
                checked={showAddressInput}
                onCheckedChange={setShowAddressInput}
              />
            </div>

            <div className="flex items-center justify-between border-b pb-3 border-gray-100 last:border-0 last:pb-0">
              <div className="space-y-0.5 max-w-[80%]">
                <label className="text-xs font-bold text-gray-800">Display Phone Number to Public</label>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Allows buyers to see your business phone number on product listings.
                </p>
              </div>
              <Switch
                checked={showPhoneInput}
                onCheckedChange={setShowPhoneInput}
              />
            </div>

            <div className="flex items-center justify-between border-b pb-3 border-gray-100 last:border-0 last:pb-0">
              <div className="space-y-0.5 max-w-[80%]">
                <label className="text-xs font-bold text-gray-800">Auto-Commit Sales</label>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Auto-commit listing sales to completed when payment is verified without manual action.
                </p>
              </div>
              <Switch
                checked={autoCommit}
                onCheckedChange={setAutoCommit}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl text-sm"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Profile Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Responder (Tier 1 exclusive) */}
      {isTier1 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Automated Customer Response</h3>
              <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1 text-[10px] font-bold">
                <Sparkles className="h-3 w-3" /> Tier 1 Active
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              Configure a response message automatically sent to buyers when a new message conversation begins.
            </p>
            <textarea
              value={autoResponderMsg}
              onChange={(e) => setAutoResponderMsg(e.target.value)}
              placeholder="e.g. Thanks for contacting Campus Books Shop! We process orders daily and will reply shortly. 📚"
              className="w-full min-h-[100px] border border-gray-300 rounded-xl p-3 text-xs focus:ring-1 focus:ring-book-500 outline-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSaveAutoResponder}
                disabled={savingAutoResponder}
                className="bg-emerald-650 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs"
              >
                {savingAutoResponder ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                Save Auto-Responder
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center rounded-2xl relative overflow-hidden">
          <div className="absolute top-3 right-3 bg-book-100 text-book-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
            Tier 1 feature
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h4 className="font-bold text-gray-900 text-sm">Automated Chat Auto-Responder</h4>
            <p className="text-xs text-gray-500">
              Auto-respond to new buyer queries instantly. Keep engagement high and close sales while you're offline.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info("Upgrade your business plan below to unlock auto-responder.")}
              className="rounded-xl border-gray-300 text-xs font-semibold mt-2"
            >
              Learn More
            </Button>
          </div>
        </Card>
      )}

      {/* Subscription/Billing Management */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-bold text-gray-900 text-base">Billing & Partner Subscription</h3>

          {loadingSubscription ? (
            <div className="text-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : isTier1 ? (
            <div className="space-y-4">
              {/* Active Tier 1 Status */}
              <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-emerald-950">Active Tier 1 Plan</p>
                    {subscriptionStatus.cancelAtPeriodEnd && (
                      <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold">
                        <Clock className="h-3 w-3 mr-1" />
                        Cancelling at period end
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-emerald-700">
                    {subscriptionStatus.cancelAtPeriodEnd
                      ? "Your plan is active until the end of this billing period, then reverts to Free."
                      : "Your Tier 1 subscription is valid. Commission rate is locked at "}
                    {!subscriptionStatus.cancelAtPeriodEnd && <strong>6.5%</strong>}
                    {!subscriptionStatus.cancelAtPeriodEnd && "."}
                  </p>
                  {subscriptionStatus.currentPeriodEnd && (
                    <p className="text-[10px] text-emerald-600">
                      {subscriptionStatus.cancelAtPeriodEnd
                        ? `Access expires: ${new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}`
                        : `Next billing renewal: ${new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Past Due Warning */}
              {subscriptionStatus.status === "past_due" && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-amber-900">Payment Past Due — Grace Period Active</p>
                    <p className="text-xs text-amber-700">
                      We couldn't process your last payment. You still have full Tier 1 access for a <strong>5-day grace period</strong>.
                      Please update your payment method to avoid downgrade.
                    </p>
                    {subscriptionStatus.currentPeriodEnd && (() => {
                      const graceEnd = new Date(new Date(subscriptionStatus.currentPeriodEnd).getTime() + 5 * 24 * 60 * 60 * 1000);
                      const daysLeft = Math.max(0, Math.ceil((graceEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
                      return (
                        <p className="text-[10px] text-amber-600 font-semibold">
                          ⏳ {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining in grace period
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Cancel / Reactivate Actions */}
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border">
                {subscriptionStatus.cancelAtPeriodEnd ? (
                  <>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">Reactivate Tier 1</h4>
                      <p className="text-[10px] text-gray-500">Resume your subscription before it expires.</p>
                    </div>
                    <Button
                      onClick={handleUpgradeSubscription}
                      disabled={isInitiatingCheckout}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                    >
                      {isInitiatingCheckout ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Reactivate (R79/mo)
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">Cancel Partner Subscription</h4>
                      <p className="text-[10px] text-gray-500">Revert to Business Free (10% commission) at month end.</p>
                    </div>
                    <Button
                      onClick={handleCancelSubscription}
                      disabled={isCancelling}
                      variant="outline"
                      className="border-red-200 hover:bg-red-50 hover:text-red-700 text-red-600 text-xs font-semibold rounded-xl"
                    >
                      {isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Cancel Plan
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upgrade CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-900">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-sm font-bold text-blue-950">Upgrade to Tier 1 Business</p>
                  <p className="text-xs text-blue-700">
                    Get locked 6.5% commission rate, bulk uploads, deal integrations, and customer auto-responders for only <strong>R79/month</strong>.
                  </p>
                </div>
                <Button
                  onClick={handleUpgradeSubscription}
                  disabled={isInitiatingCheckout}
                  className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl text-xs sm:shrink-0"
                >
                  {isInitiatingCheckout ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Upgrade Now (R79/mo)
                </Button>
              </div>

              {/* Previously cancelled notice */}
              {subscriptionStatus.status === "cancelled" && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <Info className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">
                    Your Tier 1 subscription was previously cancelled. Upgrade again to regain premium features and the 6.5% commission rate.
                  </p>
                </div>
              )}

              {/* Promo Code Input Card */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">Have a Partner Promo Code?</h4>
                  <p className="text-[10px] text-gray-500">Enter a code below to activate Tier 1 business setup instantly.</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    placeholder="Enter partner code"
                    className="rounded-xl border-gray-300 text-xs h-9 bg-white"
                  />
                  <Button
                    onClick={handleRedeemCode}
                    disabled={isRedeeming || !redeemCode.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs h-9 px-4 shrink-0"
                  >
                    {isRedeeming ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    Redeem
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
