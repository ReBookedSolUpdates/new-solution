import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { checkLiveSubscription } from "@/services/subscriptionService";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  UploadCloud,
  Loader2,
  Instagram,
  Phone,
  BadgeCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  Info,
  User,
  Key,
  Users,
  UserPlus,
  Trash2,
  Mail,
  Eye,
  EyeOff,
} from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: string;
}

export const SettingsTab: React.FC = () => {
  const { user, profile, refetchProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings Sub-Tabs
  const [subTab, setSubTab] = useState<"business" | "personal">("business");

  // Profile fields state (Business)
  const [businessName, setBusinessName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAddressToPublic, setShowAddressToPublic] = useState(false);
  const [showPhoneToPublic, setShowPhoneToPublic] = useState(false);
  const [autoCommit, setAutoCommit] = useState(false);
  const [autoResponderMsg, setAutoResponderMsg] = useState("");

  // Personal Settings states
  const [personalName, setPersonalName] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Invite states
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");

  // Loading/saving states
  const [isUploadingPfp, setIsUploadingPfp] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAutoResponder, setSavingAutoResponder] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Subscription states
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isTier1: boolean;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    testMode: boolean;
  }>({
    isTier1: false,
    status: "free",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    testMode: false,
  });
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [isInitiatingCheckout, setIsInitiatingCheckout] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Promo code redemption
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Sync profile data on load
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName || "");
      setInstagram(profile.instagramHandle || "");
      setPhone((profile as any).phone_number || "");
      setAvatarUrl((profile as any).profile_picture_url || "");
      setShowAddressToPublic(!!profile.showAddressToPublic);
      setShowPhoneToPublic(!!profile.showPhoneToPublic);
      setAutoResponderMsg((profile as any).auto_responder_message || "");
      setAutoCommit(!!(profile as any).auto_commit);

      // Personal details
      setPersonalName(profile.name || "");
      setPersonalPhone((profile as any).phone_number || "");
    }
  }, [profile]);

  // Load team collaborators
  const loadTeamCollaborators = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("business_collaborators" as any)
        .select("id, email, role, status")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const ownerRecord = { id: "owner", email: user.email || "owner@business.com", role: "Owner", status: "Active" };
      setTeamMembers([ownerRecord, ...(data || [])]);
    } catch (err: any) {
      console.error("Failed to load business team members:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadTeamCollaborators();
    }
  }, [user]);

  // Fetch live subscription status
  const fetchSubscription = async () => {
    if (!user) return;
    setLoadingSubscription(true);
    try {
      const status = await checkLiveSubscription(user.id);
      setSubscriptionStatus(status);
    } catch (err) {
      console.error("Failed to check subscription status:", err);
    } finally {
      setLoadingSubscription(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  // Handle file logo upload to storage bucket
  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploadingPfp(true);
      const timestamp = Date.now();
      const filename = `profile-${user.id}-${timestamp}.jpg`;

      const { data, error: uploadError } = await supabase.storage
        .from("user-profiles")
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("user-profiles")
        .getPublicUrl(filename);

      const publicUrl = urlData?.publicUrl;

      if (publicUrl) {
        // Update user metadata in auth
        const { error: metaError } = await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        });
        if (metaError) throw metaError;

        // Update database profiles table
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ profile_picture_url: publicUrl })
          .eq("id", user.id);

        if (profileError) throw profileError;

        setAvatarUrl(publicUrl);
        toast.success("Profile logo updated!");
        if (refetchProfile) refetchProfile();
      }
    } catch (err: any) {
      console.error("Profile picture upload error:", err);
      toast.error("Failed to upload profile picture: " + err.message);
    } finally {
      setIsUploadingPfp(false);
    }
  };

  // Helper to parse Instagram handles
  const parseInstagramHandle = (input: string): string => {
    if (!input) return "";
    let trimmed = input.trim();
    trimmed = trimmed.replace(/\/+$/, "");
    if (trimmed.includes("instagram.com/")) {
      const parts = trimmed.split("instagram.com/");
      if (parts.length > 1) {
        return parts[1].split(/[?#]/)[0];
      }
    }
    if (trimmed.startsWith("@")) {
      return trimmed.substring(1);
    }
    return trimmed;
  };

  // Save base profile settings
  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      const parsedInsta = parseInstagramHandle(instagram);
      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: businessName,
          instagram_handle: parsedInsta,
          phone_number: phone,
          profile_picture_url: avatarUrl,
          show_address_to_public: showAddressToPublic,
          show_phone_to_public: showPhoneToPublic,
          auto_commit: autoCommit,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Business profile settings saved!");
      if (refetchProfile) refetchProfile();
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Save auto-responder message (Tier 1 feature)
  const handleSaveAutoResponder = async () => {
    if (!user || !subscriptionStatus.isTier1) return;
    setSavingAutoResponder(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ auto_responder_message: autoResponderMsg.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Auto-responder message updated!");
      if (refetchProfile) refetchProfile();
    } catch (err: any) {
      toast.error("Failed to save auto-responder: " + err.message);
    } finally {
      setSavingAutoResponder(false);
    }
  };

  // Paystack upgrade subscription
  const handleUpgradeSubscription = async () => {
    if (!user) return;
    setIsInitiatingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-subscription-checkout", {
        body: { email: user.email },
      });
      if (error) throw error;
      if (data && data.authorization_url) {
        toast.loading("Redirecting to Paystack billing center...");
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No checkout url returned from server");
      }
    } catch (err: any) {
      console.error("Failed to start subscription checkout:", err);
      toast.error("Checkout failed: " + err.message);
    } finally {
      setIsInitiatingCheckout(false);
    }
  };

  // Paystack cancel subscription
  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your Tier 1 partner subscription? You will lose premium analytics and the 6.5% rate at the end of the billing period."
      )
    )
      return;

    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-subscription-cancel");
      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Cancellation failed");
      }
      toast.success(data.message || "Subscription cancellation scheduled successfully.");
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  // Promo code redemption
  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) return;
    setIsRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-business-code", {
        body: { code: redeemCode },
      });
      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Redemption failed");
      }
      toast.success(data.message || "Promo code redeemed successfully! 🎉");
      setRedeemCode("");
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.message || "Failed to redeem code");
    } finally {
      setIsRedeeming(false);
    }
  };

  // Save personal details
  const handleSavePersonal = async () => {
    if (!user) return;
    setSavingPersonal(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: personalName,
          phone_number: personalPhone,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Personal details updated successfully!");
      if (refetchProfile) refetchProfile();
    } catch (err: any) {
      toast.error("Failed to update personal details: " + err.message);
    } finally {
      setSavingPersonal(false);
    }
  };

  // Password update
  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password to authorize this change");
      return;
    }
    if (!newPassword || !confirmPassword) {
      toast.error("Please enter a new password and confirm it");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSavingPassword(true);
    try {
      // 1. Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (verifyError) {
        toast.error("Verification failed: Incorrect current password");
        return;
      }

      // 2. Update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error("Failed to update password: " + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  // Add team member collaborator invite
  const handleAddTeamMember = async () => {
    // Free users cannot add team collaborators
    if (!subscriptionStatus.isTier1) {
      toast.error("Free accounts cannot add collaborators. Upgrade to Tier 1 to invite team members.");
      return;
    }

    // Limit collaborators to max 5 added people
    const addedCount = teamMembers.filter(m => m.id !== "owner").length;
    if (addedCount >= 5) {
      toast.error("Collaborator limit reached! Tier 1 accounts can add up to 5 people maximum.");
      return;
    }

    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address to invite");
      return;
    }
    if (teamMembers.some(m => m.email.toLowerCase() === inviteEmail.trim().toLowerCase())) {
      toast.error("This user is already on the business collaborator team");
      return;
    }

    try {
      const { error } = await supabase
        .from("business_collaborators" as any)
        .insert({
          business_id: user?.id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          status: "Pending Invite"
        });

      if (error) throw error;

      setInviteEmail("");
      toast.success(`Collaborator invite successfully sent!`);
      loadTeamCollaborators();
    } catch (err: any) {
      toast.error("Failed to add collaborator: " + err.message);
    }
  };

  // Revoke team collaborator invite
  const handleRemoveTeamMember = async (id: string) => {
    if (id === "owner") return;
    try {
      const { error } = await supabase
        .from("business_collaborators" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Collaborator access has been revoked");
      loadTeamCollaborators();
    } catch (err: any) {
      toast.error("Failed to revoke collaborator access: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Settings Sub-Tabs Selector Header */}
      <div className="flex gap-2 border-b pb-3">
        <Button
          variant={subTab === "business" ? "default" : "outline"}
          onClick={() => setSubTab("business")}
          className="rounded-xl text-xs font-bold px-4 h-9"
        >
          <Building2 className="h-4 w-4 mr-1.5" />
          Business Settings
        </Button>
        <Button
          variant={subTab === "personal" ? "default" : "outline"}
          onClick={() => setSubTab("personal")}
          className="rounded-xl text-xs font-bold px-4 h-9"
        >
          <User className="h-4 w-4 mr-1.5" />
          Personal Settings
        </Button>
      </div>

      {subTab === "business" ? (
        <>
          {/* 1. BRANDING CARD */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-book-600" /> Store Profile Branding
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                <div className="relative group shrink-0">
                  <Avatar className="w-24 h-24 border-2 border-book-100 shadow-md">
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
                    onChange={handlePfpUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPfp}
                    className="rounded-xl border-gray-300 text-xs font-semibold h-9 px-4 bg-white"
                  >
                    <UploadCloud className="h-4 w-4 mr-2 text-gray-500" /> Upload Shop Logo
                  </Button>
                  <p className="text-[10px] text-gray-400">PNG, JPG or JPEG. Max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Business Display Name</label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Campus Books Shop"
                    className="rounded-xl border-gray-300 h-10 text-sm focus-visible:ring-book-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Instagram className="h-4 w-4 text-gray-500" /> Instagram Handle
                  </label>
                  <Input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@handle or URL"
                    className="rounded-xl border-gray-300 h-10 text-sm focus-visible:ring-book-500"
                  />
                </div>

                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-gray-500" /> Phone Contact Number
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +27 82 123 4567"
                    className="rounded-xl border-gray-300 h-10 text-sm focus-visible:ring-book-500"
                  />
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* PRIVACY & SYSTEM TOGGLES */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 text-sm">Public Info Display Toggles</h4>

                <div className="flex items-center justify-between border-b pb-3 border-gray-100 last:border-0 last:pb-0">
                  <div className="space-y-0.5 max-w-[80%]">
                    <label className="text-xs font-bold text-gray-800">Display Store Address to Public</label>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Show your physical pick-up address/locker info on your public seller store page.
                    </p>
                  </div>
                  <Switch checked={showAddressToPublic} onCheckedChange={setShowAddressToPublic} />
                </div>

                <div className="flex items-center justify-between border-b pb-3 border-gray-100 last:border-0 last:pb-0">
                  <div className="space-y-0.5 max-w-[80%]">
                    <label className="text-xs font-bold text-gray-800">Display Phone Number to Public</label>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Allows buyers to see your business phone number on product listings.
                    </p>
                  </div>
                  <Switch checked={showPhoneToPublic} onCheckedChange={setShowPhoneToPublic} />
                </div>

                <div className="flex items-center justify-between border-b pb-3 border-gray-100 last:border-0 last:pb-0">
                  <div className="space-y-0.5 max-w-[80%]">
                    <label className="text-xs font-bold text-gray-800">Auto-Commit Checkouts</label>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Automatically accept paid orders and start fulfillment workflows bypass manual confirmation.
                    </p>
                  </div>
                  <Switch checked={autoCommit} onCheckedChange={setAutoCommit} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl text-xs h-10 px-5"
                >
                  {savingSettings && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Profile Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. AUTO-RESPONDER MESSAGING */}
          {subscriptionStatus.isTier1 ? (
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" /> Automated Chat Response
                  </h3>
                  <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1 text-[10px] font-bold">
                    Tier 1 Active
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Configure a response message automatically sent to buyers when a new message conversation begins.
                </p>
                <textarea
                  value={autoResponderMsg}
                  onChange={(e) => setAutoResponderMsg(e.target.value)}
                  placeholder="e.g. Thanks for contacting Campus Books Shop! We process orders daily and will reply shortly. 📚"
                  className="w-full min-h-[100px] border border-gray-300 rounded-xl p-3 text-xs focus:ring-1 focus:ring-book-500 outline-none focus:border-book-500"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveAutoResponder}
                    disabled={savingAutoResponder}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs h-9 px-4"
                  >
                    {savingAutoResponder && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
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
                  className="rounded-xl border-gray-300 text-xs font-semibold mt-2 bg-white"
                >
                  Learn More
                </Button>
              </div>
            </Card>
          )}

          {/* 3. PARTNER BILLING & SUBSCRIPTIONS */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-bold text-gray-900 text-base">Billing & Partner Subscription</h3>

              {loadingSubscription ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-xl" />
                  <div className="h-10 bg-gray-100 rounded-xl w-32" />
                </div>
              ) : subscriptionStatus.isTier1 ? (
                <div className="space-y-4">
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

                  {subscriptionStatus.status === "past_due" && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-250">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-amber-900">Payment Past Due — Grace Period Active</p>
                        <p className="text-xs text-amber-700">
                          We couldn't process your last payment. You still have full Tier 1 access for a <strong>5-day grace period</strong>.
                          Please update your payment method to avoid downgrade.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border">
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
                          {isInitiatingCheckout ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
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
                          className="border-red-200 hover:bg-red-50 hover:text-red-700 text-red-650 text-xs font-semibold rounded-xl"
                        >
                          {isCancelling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Cancel Plan
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-900">
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="text-sm font-bold text-blue-950">Upgrade to Tier 1 Business</p>
                      <p className="text-xs text-blue-700">
                        Get locked 6.5% commission rate, bulk uploads, deal integrations, and customer auto-responders for only <strong>R79/month</strong>.
                      </p>
                    </div>
                    <Button
                      onClick={handleUpgradeSubscription}
                      disabled={isInitiatingCheckout}
                      className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl text-xs sm:shrink-0 h-10 px-5"
                    >
                      {isInitiatingCheckout && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Upgrade Now (R79/mo)
                    </Button>
                  </div>

                  {subscriptionStatus.status === "cancelled" && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <Info className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600">
                        Your Tier 1 subscription was previously cancelled. Upgrade again to regain premium features.
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-200 space-y-3">
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
                        {isRedeeming && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                        Redeem
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* PERSONAL DETAILS CARD */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <User className="h-5 w-5 text-book-600" /> Account Owner Login Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Account Owner Name</label>
                  <Input
                    value={personalName}
                    onChange={(e) => setPersonalName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="rounded-xl border-gray-300 h-10 text-sm focus-visible:ring-book-500"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Login Email Address</label>
                  <div className="relative">
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="rounded-xl border-gray-200 h-10 text-sm bg-gray-55/40 text-gray-500 cursor-not-allowed select-none"
                    />
                    <Badge className="absolute right-2.5 top-2.5 bg-gray-100 text-gray-500 border-0 text-[8px] font-black uppercase">
                      Read Only
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-700">Owner Contact Number</label>
                  <Input
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    placeholder="e.g. +27 82 123 4567"
                    className="rounded-xl border-gray-300 h-10 text-sm focus-visible:ring-book-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSavePersonal}
                  disabled={savingPersonal}
                  className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl text-xs h-10 px-5"
                >
                  {savingPersonal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Personal Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PASSWORD SECURITY CARD */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-650" /> Login Password Update
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="rounded-xl border-gray-300 h-10 pr-10 text-sm focus-visible:ring-book-500"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-gray-655"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">New Password</label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="rounded-xl border-gray-300 h-10 pr-10 text-sm focus-visible:ring-book-500"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-gray-655"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Confirm New Password</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="rounded-xl border-gray-300 h-10 pr-10 text-sm focus-visible:ring-book-500"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-gray-655"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleUpdatePassword}
                  disabled={savingPassword}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs h-10 px-5"
                >
                  {savingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TEAM COLLABORATORS CARD */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-book-600" /> Business Team Collaborators
                </h3>
                {subscriptionStatus.isTier1 && (
                  <Badge className="bg-indigo-150 text-indigo-805 text-[10px] font-black border-0">
                    Added: {teamMembers.filter(m => m.id !== "owner").length} / 5
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-gray-500 leading-relaxed">
                Add, invite, and coordinate teammate access to your business store. Invited users will be authorized to view orders, catalog configurations, and payouts.
              </p>

              {/* Add Teammate Invite Form */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 space-y-4">
                <h4 className="font-bold text-gray-800 text-xs flex items-center gap-1">
                  <UserPlus className="h-4 w-4 text-gray-500" /> Invite Collaborator
                </h4>
                
                {!subscriptionStatus.isTier1 ? (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-xs leading-normal">
                      <strong>Free Plan Restriction:</strong> Only Tier 1 Business accounts can add team collaborators. Upgrade your plan in the <strong>Business Settings</strong> tab to invite up to 5 collaborators.
                    </AlertDescription>
                  </Alert>
                ) : teamMembers.filter(m => m.id !== "owner").length >= 5 ? (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-xs leading-normal">
                      <strong>Collaborator Limit Reached:</strong> You have added the maximum of 5 team members allowed on the Tier 1 plan. Please revoke access for an existing member if you wish to add a new one.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@email.com"
                      disabled={!subscriptionStatus.isTier1 || teamMembers.filter(m => m.id !== "owner").length >= 5}
                      className="pl-10 rounded-xl border-gray-300 text-xs h-10 bg-white focus-visible:ring-book-500"
                    />
                  </div>
                  <div>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      disabled={!subscriptionStatus.isTier1 || teamMembers.filter(m => m.id !== "owner").length >= 5}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-xs outline-none bg-white border-gray-300 h-10 font-semibold text-gray-700 focus:ring-1 focus:ring-book-500 disabled:opacity-50"
                    >
                      <option value="Viewer">Viewer (Read Only)</option>
                      <option value="Manager">Manager (Edit Catalog/Orders)</option>
                      <option value="Admin">Admin (Full Control)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    onClick={handleAddTeamMember}
                    disabled={!subscriptionStatus.isTier1 || teamMembers.filter(m => m.id !== "owner").length >= 5}
                    className="bg-book-600 hover:bg-book-700 text-white font-bold rounded-xl text-xs h-9 px-5"
                  >
                    Send Invitation
                  </Button>
                </div>
              </div>

              {/* Teammates List */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-800 text-xs">Active Collaborators & Pending Invites</h4>
                <div className="border border-gray-150 rounded-2xl overflow-hidden divide-y">
                  {teamMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3.5 hover:bg-gray-50 bg-white transition-all text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{member.email}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Role: <span className="font-bold text-gray-500">{member.role}</span></p>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge className={`text-[9px] font-black tracking-wider uppercase border-0 px-2 py-0.5 rounded ${
                          member.status === "Active" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-amber-100 text-amber-800 animate-pulse"
                        }`}>
                          {member.status}
                        </Badge>
                        {member.id !== "owner" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveTeamMember(member.id)}
                            className="h-8 w-8 hover:bg-red-50 text-gray-400 hover:text-red-700 rounded-lg"
                            title="Revoke access"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SettingsTab;
