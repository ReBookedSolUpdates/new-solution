import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Users, CheckCircle2, AlertTriangle, LogIn } from "lucide-react";
import Layout from "@/components/Layout";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const emailParam = searchParams.get("email") || "";
  const businessParam = searchParams.get("business") || "";

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"pending" | "already_accepted" | "not_found" | "error">("pending");
  const [collaboratorRecordId, setCollaboratorRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!emailParam || !businessParam) {
      setInviteStatus("not_found");
      setLoading(false);
      return;
    }
    loadInviteDetails();
  }, [emailParam, businessParam]);

  const loadInviteDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch business name
      const { data: businessProfile, error: bizErr } = await supabase
        .from("profiles")
        .select("business_name")
        .eq("id", businessParam)
        .maybeSingle();

      if (bizErr) throw bizErr;
      setBusinessName(businessProfile?.business_name || "ReBooked Business Partner");

      // 2. Fetch collaborator invite record
      const { data: collabInvite, error: collabErr } = await supabase
        .from("business_collaborators" as any)
        .select("id, role, status")
        .eq("business_id", businessParam)
        .eq("email", emailParam.toLowerCase())
        .maybeSingle();

      if (collabErr) throw collabErr;

      if (!collabInvite) {
        setInviteStatus("not_found");
      } else if (collabInvite.status === "Active") {
        setInviteStatus("already_accepted");
      } else {
        setInviteRole(collabInvite.role);
        setCollaboratorRecordId(collabInvite.id);
        setInviteStatus("pending");
      }
    } catch (err: any) {
      console.error("Error loading invite details:", err);
      setInviteStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user || !collaboratorRecordId) return;
    setAccepting(true);
    try {
      const { error } = await supabase
        .from("business_collaborators" as any)
        .update({
          status: "Active",
          collaborator_id: user.id
        })
        .eq("id", collaboratorRecordId);

      if (error) throw error;

      // Update user's own profile to mark isBusiness true so they get the business profile tab
      await supabase
        .from("profiles")
        .update({ isBusiness: true })
        .eq("id", user.id);

      toast.success("Invitation accepted! Welcome to the team.");
      navigate("/business-profile");
    } catch (err: any) {
      console.error("Failed to accept invite:", err);
      toast.error("Failed to accept invite: " + err.message);
    } finally {
      setAccepting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 text-book-600 animate-spin" />
          <p className="text-gray-500 font-medium">Verifying invitation details...</p>
        </div>
      );
    }

    if (inviteStatus === "not_found") {
      return (
        <div className="text-center py-8 space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Invitation Not Found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              This invitation could not be found. Please request the business owner to re-invite you.
            </p>
          </div>
          <Button onClick={() => navigate("/")} className="bg-book-600 hover:bg-book-700 rounded-xl">
            Go to Homepage
          </Button>
        </div>
      );
    }

    if (inviteStatus === "already_accepted") {
      return (
        <div className="text-center py-8 space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Invitation Already Accepted</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              You are already an active collaborator for <strong>{businessName}</strong>.
            </p>
          </div>
          <Button onClick={() => navigate("/business-profile")} className="bg-book-600 hover:bg-book-700 rounded-xl">
            Go to Business Dashboard
          </Button>
        </div>
      );
    }

    if (inviteStatus === "error") {
      return (
        <div className="text-center py-8 space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Verification Error</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              An error occurred while verifying your invitation. Please try again later.
            </p>
          </div>
          <Button onClick={loadInviteDetails} variant="outline" className="rounded-xl">
            Retry Check
          </Button>
        </div>
      );
    }

    // Pending invitation states
    if (!user) {
      return (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
            <Users className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-bold text-emerald-950">You're Invited!</p>
              <p className="text-xs text-emerald-700 mt-1">
                You have been invited to join <strong>{businessName}</strong> as a <strong>{inviteRole}</strong>. 
                Please log in or sign up to accept this invitation.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate(`/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
              className="bg-book-600 hover:bg-book-700 text-white rounded-xl h-11 flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" /> Log In / Sign Up to Accept
            </Button>
          </div>
        </div>
      );
    }

    // User is logged in
    const isEmailMatching = user.email?.toLowerCase() === emailParam.toLowerCase();

    if (!isEmailMatching) {
      return (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-950">Email Account Mismatch</p>
              <p className="text-xs text-amber-700">
                You are currently logged in as <strong className="text-amber-950">{user.email}</strong>, 
                but this invitation was sent to <strong className="text-amber-950">{emailParam}</strong>.
              </p>
              <p className="text-xs text-amber-700">
                Please log out and log in to the matching account to accept this invitation.
              </p>
            </div>
          </div>
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            variant="outline"
            className="w-full rounded-xl h-11 border-gray-300 hover:bg-gray-50"
          >
            Log Out Current Account
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3 text-left">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-emerald-950">Ready to Join</p>
            <p className="text-xs text-emerald-700">
              You are logged in as <strong className="text-emerald-950">{user.email}</strong>. 
              Click below to accept the invitation and join the business workspace.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="border bg-gray-50 rounded-2xl p-4 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Workspace Role</span>
            <h4 className="text-base font-bold text-gray-900 mt-1">{inviteRole}</h4>
          </div>
          <Button
            onClick={handleAcceptInvite}
            disabled={accepting}
            className="bg-book-600 hover:bg-book-700 text-white rounded-xl h-11"
          >
            {accepting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Accept Invitation & Join Workspace
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center items-center">
        <Card className="w-full max-w-md border-gray-200 shadow-lg rounded-3xl">
          <CardHeader className="text-center pb-4">
            <div className="bg-book-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-book-100 text-book-600">
              <Users className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Workspace Invitation</CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              Join <strong>{businessName || "ReBooked Business Partner"}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
