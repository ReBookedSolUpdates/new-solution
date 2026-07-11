import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";
import { WalletService, WalletBalance, WalletTransaction } from "@/services/walletService";
import { toast } from "sonner";
import PayoutRequestForm from "./PayoutRequestForm";

const WalletTab: React.FC = () => {
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const exportTransactionsToCsv = () => {
    try {
      const headers = ["ID", "Type", "Amount (ZAR)", "Reason", "Status", "Date"];
      const rows = transactions.map((tx) => [
        tx.id,
        tx.type,
        tx.amount.toFixed(2),
        tx.reason || "",
        tx.status,
        new Date(tx.created_at).toISOString(),
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `wallet_transactions_${Date.now()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Transactions exported successfully");
    } catch (error) {
      toast.error("Failed to export transactions");
    }
  };

  const downloadTransactionReceipt = async (tx: WalletTransaction) => {
    setDownloadingId(tx.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
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

  // Fetch wallet balance using React Query
  const { data: balance = { available_balance: 0, pending_balance: 0, total_earned: 0 }, isLoading: balanceLoading } = useQuery({
    queryKey: ["walletBalance"],
    queryFn: WalletService.getWalletBalance,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch transaction history using React Query
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => WalletService.getTransactionHistory(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loading = balanceLoading || transactionsLoading;

  const handlePayoutSubmitted = () => {
    setShowPayoutForm(false);
    // Invalidate wallet queries to refetch latest data
    queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
    queryClient.invalidateQueries({ queryKey: ["walletTransactions"] });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted shadow-md">
              <CardHeader className="pb-3">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-muted rounded animate-pulse" />
          <div className="h-10 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance */}
        <Card className="border-l-4 border-l-book-600 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-book-600">Available Balance</CardTitle>
              <TrendingUp className="h-5 w-5 text-book-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-book-600">
              {WalletService.formatZAR(balance.available_balance)}
            </div>
            <p className="text-xs text-book-500 mt-2">Ready to withdraw</p>
          </CardContent>
        </Card>

        {/* Pending Balance */}
        <Card className="border-l-4 border-l-book-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-book-600">Pending Payout</CardTitle>
              <Clock className="h-5 w-5 text-book-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-book-500">
              {WalletService.formatZAR(balance.pending_balance)}
            </div>
            <p className="text-xs text-book-500 mt-2">Being processed</p>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card className="border-l-4 border-l-book-700 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-book-600">Total Earned</CardTitle>
              <CheckCircle className="h-5 w-5 text-book-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-book-700">
              {WalletService.formatZAR(balance.total_earned)}
            </div>
            <p className="text-xs text-book-500 mt-2">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => setShowPayoutForm(true)}
          className="bg-gradient-to-r from-book-600 to-book-700 hover:from-book-700 hover:to-book-800"
          disabled={balance.available_balance <= 0}
        >
          <TrendingDown className="h-4 w-4 mr-2" />
          Request Payout
        </Button>
        <Button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
            queryClient.invalidateQueries({ queryKey: ["walletTransactions"] });
          }}
          variant="outline"
        >
          Refresh
        </Button>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-book-900">
            <Clock className="h-5 w-5 text-book-600" />
            Transaction History
          </CardTitle>
          {transactions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportTransactionsToCsv}
              className="text-xs flex items-center gap-1.5 border-book-200 text-book-650 hover:bg-book-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-book-200 mx-auto mb-3" />
              <p className="text-book-600">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-book-50 rounded-lg border border-book-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {tx.type === "credit" ? (
                        <TrendingUp className="h-4 w-4 text-book-600 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-book-900">{tx.reason || "Transaction"}</p>
                        <p className="text-xs text-book-500">
                          {new Date(tx.created_at).toLocaleDateString("en-ZA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 text-right flex items-center gap-4 flex-shrink-0">
                    <div>
                      <div className={`font-bold ${WalletService.getTransactionTypeColor(tx.type)}`}>
                        {tx.type === "credit" ? "+" : "-"}
                        {WalletService.formatZAR(tx.amount)}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {tx.status}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => downloadTransactionReceipt(tx)}
                      disabled={downloadingId === tx.id}
                      className="h-8 w-8 rounded-lg border-book-100 hover:bg-book-100/50 hover:text-book-700"
                      title="Download Transaction Receipt"
                    >
                      {downloadingId === tx.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-book-600" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-book-600" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="bg-book-50 border-book-200">
        <AlertTriangle className="h-4 w-4 text-book-600" />
        <AlertDescription className="text-book-700 text-sm">
          <strong>How it works:</strong> When a buyer marks a book as received, 90% of the book price is automatically added to your available balance. You can request a payout anytime.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default WalletTab;
