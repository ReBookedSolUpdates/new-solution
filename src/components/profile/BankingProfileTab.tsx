import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  Building2,
  Eye,
  Settings,
  Loader2,
  Copy,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BankingService } from "@/services/bankingService";
import { useBanking } from "@/hooks/useBanking";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { BankingSubaccount } from "@/types/banking";
import BankingForm from "@/components/banking/BankingForm";
import PasswordVerificationForm from "@/components/banking/PasswordVerificationForm";
import BankingDecryptionService, { type DecryptedBankingDetails } from "@/services/bankingDecryptionService";
import WalletTab from "./WalletTab";

const BankingProfileTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    bankingDetails,
    isLoading,
    hasBankingSetup,
    isActive,
    businessName,
    bankName,
    maskedAccountNumber,
    refreshBankingDetails,
  } = useBanking();

  const [decryptedDetails, setDecryptedDetails] = useState<DecryptedBankingDetails | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingBanking, setIsDeletingBanking] = useState(false);

  const handleSetupBanking = () => {
    setShowSetupDialog(true);
  };

  const handleUpdateSuccess = () => {
    setShowUpdateDialog(false);
    setIsPasswordVerified(false);
    refreshBankingDetails();
    toast.success("Banking details updated successfully!");
  };

  const handlePasswordVerified = () => {
    setIsPasswordVerified(true);
  };

  const handleCancelUpdate = () => {
    setShowUpdateDialog(false);
    setIsPasswordVerified(false);
  };

  const handleSetupSuccess = () => {
    setShowSetupDialog(false);
    setIsPasswordVerified(false);
    refreshBankingDetails();
    toast.success("Banking details setup successfully!");
  };

  const handleCancelSetup = () => {
    setShowSetupDialog(false);
    setIsPasswordVerified(false);
  };

  const handleDecryptAndView = async () => {
    setIsDecrypting(true);
    try {
      const result = await BankingDecryptionService.decryptBankingDetails();
      if (result.success && result.data) {
        setDecryptedDetails(result.data);
        setShowFullAccount(true);
        toast.success("Banking details decrypted successfully");
      } else {
        toast.error(result.error || "Failed to decrypt banking details");
      }
    } catch (error) {
      toast.error("Failed to decrypt banking details");
    } finally {
      setIsDecrypting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDeleteBankingDetails = async () => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setIsDeletingBanking(true);
    try {
      const { error } = await supabase
        .from("banking_subaccounts")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to delete banking details");
        return;
      }

      const updateData: any = {
        subaccount_code: null,
        preferences: {
          banking_setup_complete: false,
        },
      };
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (profileError) {
      }

      setShowDeleteDialog(false);
      setShowFullAccount(false);
      setDecryptedDetails(null);
      refreshBankingDetails();
      toast.success("Banking details deleted successfully");
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeletingBanking(false);
    }
  };

  const handleEditSuccess = () => {
    refreshBankingDetails();
    toast.success("Banking details updated successfully!");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Wallet skeleton */}
        <Card className="border-2 border-blue-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-100">
            <div className="h-7 w-24 bg-blue-200/50 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Banking skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-32 bg-muted rounded-lg animate-pulse" />
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WalletTab />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-book-900">
            <CreditCard className="h-5 w-5 text-book-600" />
            Banking Profile
            {isActive && (
              <Badge variant="default" className="bg-book-100 text-book-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {bankingDetails && !isActive && (
              <Badge
                variant="outline"
                className="border-orange-500 text-orange-700"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {bankingDetails.status === "pending"
                  ? "Pending Verification"
                  : "Inactive"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasBankingSetup && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-book-50 to-book-100 p-6 rounded-lg border border-book-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Your Name
                    </label>
                    <p className="text-book-500 font-semibold">Not Set</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Bank
                    </label>
                    <p className="text-book-500 font-semibold">Not Selected</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Account Number
                    </label>
                    <p className="text-book-500 font-mono font-semibold">****</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Status
                    </label>
                    <div>
                      <Badge variant="outline" className="border-orange-500 text-orange-700">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Setup Required
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Email
                    </label>
                    <p className="text-book-900">{user?.email || "Not Set"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Setup Date
                    </label>
                    <p className="text-book-500">Not Completed</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSetupBanking}
                  className="bg-book-600 hover:bg-book-700 flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Set Up Banking
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {hasBankingSetup && bankingDetails && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-book-50 to-book-100 p-6 rounded-lg border border-book-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Your Name
                    </label>
                    <p className="text-book-900 font-semibold">
                      {showFullAccount && decryptedDetails?.business_name
                        ? decryptedDetails.business_name
                        : "••••••••"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Bank
                    </label>
                    <p className="text-book-900 font-semibold">
                      {showFullAccount && decryptedDetails?.bank_name
                        ? decryptedDetails.bank_name
                        : "••••••••"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Account Number
                    </label>
                    <div className="space-y-2">
                      <p className="text-book-900 font-mono font-semibold">
                        {showFullAccount && decryptedDetails?.account_number
                          ? decryptedDetails.account_number
                          : maskedAccountNumber}
                      </p>
                      {showFullAccount && decryptedDetails?.account_number && (
                        <Button
                          onClick={() => copyToClipboard(decryptedDetails.account_number, "Account Number")}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-book-600 hover:text-book-800"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Status
                    </label>
                    <div>
                      <Badge
                        variant={isActive ? "default" : "outline"}
                        className={
                          isActive
                            ? "bg-book-100 text-book-800 border-book-200"
                            : "border-orange-500 text-orange-700"
                        }
                      >
                        {isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {bankingDetails.status}
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Email
                    </label>
                    <p className="text-book-900">
                      {showFullAccount && decryptedDetails?.email
                        ? decryptedDetails.email
                        : user?.email || "Not Set"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-book-700">
                      Setup Date
                    </label>
                    <p className="text-book-900">
                      {new Date(bankingDetails.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={showFullAccount ? () => {
                    setShowFullAccount(false);
                    setDecryptedDetails(null);
                  } : handleDecryptAndView}
                  className="bg-book-600 hover:bg-book-700 flex items-center gap-2"
                  disabled={isDecrypting}
                >
                  {isDecrypting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showFullAccount ? "Hide Details" : "View Details"}
                </Button>
                <Button
                  onClick={() => setShowUpdateDialog(true)}
                  variant="outline"
                  size="sm"
                  className="text-book-600 border-book-200 hover:bg-book-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Update Details
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Details
                </Button>
              </div>

              <div className="bg-book-50 border border-book-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-book-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-book-900 mb-1">Security & Privacy</h4>
                    <p className="text-sm text-book-700">
                      Your banking details are encrypted at rest and only decrypted when you explicitly
                      click "View Details".
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      <Dialog open={showUpdateDialog} onOpenChange={handleCancelUpdate}>
        <DialogContent className="w-[90vw] max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-book-200 shadow-xl mx-auto">
          <DialogHeader className="pb-4 border-b border-book-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-book-50 rounded-lg">
                {!isPasswordVerified ? (
                  <Shield className="h-5 w-5 text-book-600" />
                ) : (
                  <CreditCard className="h-5 w-5 text-book-600" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {!isPasswordVerified ? "Verify Your Password" : "Update Banking Details"}
                </DialogTitle>
                <DialogDescription className="text-sm text-book-600 mt-1">
                  {!isPasswordVerified
                    ? "Enter your password to proceed"
                    : "Securely update your banking information"
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="pt-4">
            {!isPasswordVerified ? (
              <PasswordVerificationForm
                onVerified={handlePasswordVerified}
                onCancel={handleCancelUpdate}
              />
            ) : (
              <BankingForm
                onSuccess={handleUpdateSuccess}
                onCancel={handleCancelUpdate}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSetupDialog} onOpenChange={handleCancelSetup}>
        <DialogContent className="w-[92vw] max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Set Up Banking Details
            </DialogTitle>
            <DialogDescription>
              Add your banking information to start selling books and receive payments securely.
              All information is encrypted and stored safely.
            </DialogDescription>
          </DialogHeader>
          <BankingForm
            onSuccess={handleSetupSuccess}
            onCancel={handleCancelSetup}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl border border-red-100 shadow-xl max-w-sm">
          <AlertDialogHeader className="pb-4 border-b border-red-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-semibold text-gray-900">
                  Delete Banking Details
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600 mt-3 leading-relaxed">
              This will permanently remove your banking information. You won't be able to accept payments or sell books until you set up banking again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 pt-4 border-t border-red-50">
            <AlertDialogCancel
              disabled={isDeletingBanking}
              className="flex-1 h-10 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Keep It
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBankingDetails}
              disabled={isDeletingBanking}
              className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {isDeletingBanking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BankingProfileTab;
