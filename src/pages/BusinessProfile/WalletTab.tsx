import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBanking } from "@/hooks/useBanking";
import { toast } from "sonner";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  FileText,
  CreditCard,
  Plus,
  Eye,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import PayoutRequestForm from "@/components/profile/PayoutRequestForm";
import BankingForm from "@/components/banking/BankingForm";
import PasswordVerificationForm from "@/components/banking/PasswordVerificationForm";
import BankingDecryptionService, { type DecryptedBankingDetails } from "@/services/bankingDecryptionService";
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

export const WalletTab: React.FC = () => {
  const { user } = useAuth();
  
  // Wallet states
  const [walletBalance, setWalletBalance] = useState({ available_balance: 0, pending_balance: 0, total_earned: 0 });
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Banking integrations states
  const {
    bankingDetails,
    isLoading: bankingLoading,
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
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingBanking, setIsDeletingBanking] = useState(false);

  // Fetch Wallet Balance
  const fetchWalletBalance = useCallback(async () => {
    if (!user) return;
    setLoadingWallet(true);
    try {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("available_balance, pending_balance, total_earned")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setWalletBalance({
          available_balance: Number(data.available_balance) / 100,
          pending_balance: Number(data.pending_balance) / 100,
          total_earned: Number(data.total_earned) / 100,
        });
      }
    } catch (err) {
      console.warn("Failed to fetch wallet balance:", err);
    } finally {
      setLoadingWallet(false);
    }
  }, [user]);

  // Fetch Transactions History
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setTransactions(
          data.map((tx: any) => ({
            id: tx.id,
            type: tx.type,
            amount: Number(tx.amount) / 100,
            reason: tx.reason,
            reference_order_id: tx.reference_order_id,
            reference_payout_id: tx.reference_payout_id,
            status: tx.status,
            created_at: tx.created_at,
          }))
        );
      }
    } catch (err) {
      console.warn("Failed to fetch transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
      fetchTransactions();
    }
  }, [user, fetchWalletBalance, fetchTransactions]);

  const handlePayoutSubmitted = () => {
    setShowPayoutForm(false);
    fetchWalletBalance();
    fetchTransactions();
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      const headers = ["ID", "Type", "Amount (ZAR)", "Reason", "Status", "Date"];
      const rows = transactions.map((tx) => [
        tx.id,
        tx.type,
        tx.amount.toFixed(2),
        tx.reason || "",
        tx.status,
        tx.created_at ? new Date(tx.created_at).toISOString() : "",
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [
          headers.join(","),
          ...rows.map((row) =>
            row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `business_wallet_transactions_${user?.id || "unknown"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error("Failed to export transactions");
    }
  };

  // Receipt Download
  const downloadReceipt = async (tx: any) => {
    setDownloadingId(tx.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const receiptText = `
=========================================
        REBOOKED TRANSACTION RECEIPT
=========================================
Transaction ID: ${tx.id}
Type:           ${tx.type.toUpperCase()}
Amount:         R ${tx.amount.toFixed(2)}
Reason:         ${tx.reason || "Wallet Transaction"}
Status:         ${tx.status.toUpperCase()}
Date:           ${new Date(tx.created_at).toLocaleString("en-ZA")}
=========================================
Thank you for using ReBooked Solutions!
      `.trim();
      
      const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `receipt_${tx.id}.txt`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Receipt downloaded successfully");
    } catch (error) {
      toast.error("Failed to download receipt");
    } finally {
      setDownloadingId(null);
    }
  };

  // Banking Dialog Actions
  const handleUpdateSuccess = () => {
    setShowUpdateDialog(false);
    setIsPasswordVerified(false);
    refreshBankingDetails();
    toast.success("Banking details updated successfully!");
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
    if (showFullAccount) {
      setShowFullAccount(false);
      setDecryptedDetails(null);
      return;
    }
    setIsDecrypting(true);
    try {
      const result = await BankingDecryptionService.decryptBankingDetails();
      if (result && result.success && result.data) {
        setDecryptedDetails(result.data);
        setShowFullAccount(true);
      } else {
        toast.error(result.error || "Failed to decrypt bank details. Check password.");
      }
    } catch (err) {
      toast.error("Error decrypting bank details");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDeleteBankingDetails = async () => {
    setIsDeletingBanking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          subaccount_code: null,
          banking_details_encrypted: null,
          banking_details_iv: null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update local hook data
      refreshBankingDetails();
      setShowDeleteDialog(false);
      setDecryptedDetails(null);
      setShowFullAccount(false);
      toast.success("Banking details deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete banking details: " + error.message);
    } finally {
      setIsDeletingBanking(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. WALLET BALANCE WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Available Balance",
            val: walletBalance.available_balance,
            desc: "Ready to withdraw",
            icon: TrendingUp,
            color: "border-l-emerald-500 text-emerald-600 bg-emerald-50/20",
          },
          {
            title: "Pending Payout",
            val: walletBalance.pending_balance,
            desc: "Being processed",
            icon: Clock,
            color: "border-l-amber-500 text-amber-600 bg-amber-50/20",
          },
          {
            title: "Total Lifetime Earned",
            val: walletBalance.total_earned,
            desc: "All-time earnings",
            icon: CheckCircle,
            color: "border-l-indigo-500 text-indigo-650 bg-indigo-50/20",
          },
        ].map((item) => (
          <Card key={item.title} className={`border border-gray-150 border-l-4 shadow-sm ${item.color}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {item.title}
                </span>
                <item.icon className="h-5 w-5 opacity-80" />
              </div>
              <p className="text-3xl font-bold mt-3">R{item.val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. BANKING PROFILE & PAYOUT REQUESTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Banking subaccount card */}
        <div className="lg:col-span-2">
          {bankingLoading ? (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="h-20 bg-gray-50 rounded-xl animate-pulse" />
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-gray-900 text-base">
                  <CreditCard className="h-5 w-5 text-book-600" /> Banking Payout Profile
                  {isActive && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1 text-[10px] font-bold">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Active Payouts
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {hasBankingSetup ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Account Holder</span>
                        <p className="text-sm font-bold text-gray-800 mt-0.5">{businessName || "Registered Shop"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Destination Bank</span>
                        <p className="text-sm font-bold text-gray-800 mt-0.5">{bankName || "SA Bank"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Account Number</span>
                        <p className="text-sm font-mono font-bold text-gray-800 mt-1">
                          {showFullAccount && decryptedDetails
                            ? decryptedDetails.account_number
                            : maskedAccountNumber || "••••••••••"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                      <Button
                        variant="outline"
                        onClick={handleDecryptAndView}
                        disabled={isDecrypting}
                        className="rounded-xl border-gray-300 text-xs font-bold h-9 px-4 bg-white"
                      >
                        {isDecrypting ? "Decrypting..." : showFullAccount ? "Hide Account" : "View Full"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsPasswordVerified(false);
                          setShowPasswordDialog(true);
                        }}
                        className="rounded-xl border-gray-300 text-xs font-bold h-9 px-4 bg-white"
                      >
                        Update Account Details
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteDialog(true)}
                        className="rounded-xl border-red-200 hover:bg-red-50 hover:text-red-700 text-red-650 text-xs font-bold h-9 px-4 bg-white"
                      >
                        Delete Details
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto animate-bounce" />
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">No Payout Bank Account Setup</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">
                        To receive payouts for school supplies or books sold, you must link your bank account.
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowSetupDialog(true)}
                      className="bg-book-600 hover:bg-book-700 text-white font-bold rounded-xl text-xs h-10 px-6"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Link Bank Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payout controls */}
        <div className="flex flex-col gap-6">
          <Card className="border border-gray-250 bg-gradient-to-br from-indigo-50/10 to-white shadow-sm">
            <CardContent className="p-6">
              <h4 className="font-bold text-gray-900 text-sm">Payout Management</h4>
              <p className="text-xs text-gray-500 leading-relaxed mt-2">
                Withdraw your available balance directly to your linked bank account. Processing takes 24-48 hours.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  onClick={() => setShowPayoutForm(true)}
                  disabled={walletBalance.available_balance <= 0 || !hasBankingSetup}
                  className="bg-book-600 hover:bg-book-700 text-white font-bold rounded-xl text-xs h-10 px-5 shadow-sm"
                >
                  Request Payout
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    fetchWalletBalance();
                    fetchTransactions();
                  }}
                  className="rounded-xl border-gray-300 text-xs font-semibold h-10 px-5 bg-white"
                >
                  Refresh Balances
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. TRANSACTION HISTORY */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <CardTitle className="text-base text-gray-900 font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-book-600" /> Wallet Transactions
          </CardTitle>
          {transactions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs h-8 flex items-center gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl bg-white"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {loadingTransactions ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10">
              <Wallet className="h-12 w-12 text-gray-350 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No transactions registered yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 bg-gray-50/50 hover:bg-gray-50 rounded-xl border border-gray-100 transition-all text-xs"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    {tx.type === "credit" ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-red-50 text-red-650 shrink-0">
                        <TrendingDown className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 truncate text-[11px]" title={tx.reason}>
                        {tx.reason || "Wallet Transaction"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(tx.created_at).toLocaleString("en-ZA", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-gray-100 ml-4">
                    <div className="text-right">
                      <div className={`font-bold text-xs ${tx.type === "credit" ? "text-emerald-600" : "text-red-650"}`}>
                        {tx.type === "credit" ? "+" : "-"} R{tx.amount.toFixed(2)}
                      </div>
                      <Badge className="bg-white border text-gray-650 font-bold hover:bg-white text-[9px] px-1.5 mt-0.5 capitalize rounded">
                        {tx.status}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => downloadReceipt(tx)}
                      disabled={downloadingId === tx.id}
                      className="h-8 w-8 rounded-lg border-gray-200 hover:bg-gray-100 bg-white"
                    >
                      {downloadingId === tx.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-book-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-book-650" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. MODALS FOR SETUP/UPDATES & PASSWORD VERIFICATION */}
      {/* Password Verification Modal */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) setIsPasswordVerified(false);
      }}>
        <DialogContent className="w-[92vw] max-w-sm sm:max-w-md rounded-2xl mx-auto bg-white border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-650" /> Verify Identity
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Please enter your login password to authorize updating your banking details.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-3">
            <PasswordVerificationForm
              onVerified={() => {
                setShowPasswordDialog(false);
                setIsPasswordVerified(true);
                setShowUpdateDialog(true);
              }}
              onCancel={() => {
                setShowPasswordDialog(false);
                setIsPasswordVerified(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Banking Update Form Modal */}
      <Dialog open={showUpdateDialog} onOpenChange={(open) => {
        setShowUpdateDialog(open);
        if (!open) setIsPasswordVerified(false);
      }}>
        <DialogContent className="w-[92vw] max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl mx-auto bg-white border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-book-600" /> Update Bank Payout Subaccount
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Securely update your banking information for withdrawals.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-3">
            <BankingForm
              onSuccess={handleUpdateSuccess}
              onCancel={() => {
                setShowUpdateDialog(false);
                setIsPasswordVerified(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSetupDialog} onOpenChange={handleCancelSetup}>
        <DialogContent className="w-[92vw] max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl mx-auto bg-white border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <CreditCard className="h-5 w-5 text-book-600" /> Link Bank Payout Details
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Add your banking details to start receiving automatic split payments. Details are encrypted and secure.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <BankingForm
              onSuccess={handleSetupSuccess}
              onCancel={handleCancelSetup}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl border shadow-xl max-w-sm bg-white">
          <AlertDialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-650" />
              <AlertDialogTitle className="text-base font-bold text-gray-900">
                Delete Banking Setup?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-gray-500 mt-2 leading-relaxed">
              This will permanently delete your banking subaccount. You won't be able to request payouts or receive split payments for listings until a new bank is linked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 pt-3 border-t">
            <AlertDialogCancel
              disabled={isDeletingBanking}
              className="flex-1 h-9 border rounded-xl text-gray-600 text-xs font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBankingDetails}
              disabled={isDeletingBanking}
              className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            >
              {isDeletingBanking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Delete Bank
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payout dialog popup */}
      {showPayoutForm && (
        <PayoutRequestForm
          availableBalance={walletBalance.available_balance}
          onSubmitted={handlePayoutSubmitted}
          onCancel={() => setShowPayoutForm(false)}
        />
      )}
    </div>
  );
};

export default WalletTab;
