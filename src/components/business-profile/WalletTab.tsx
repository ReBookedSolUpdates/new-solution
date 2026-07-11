import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingDown,
  Clock,
  Loader2,
  FileText,
  AlertCircle,
  Building2,
} from "lucide-react";
import PayoutRequestForm from "@/components/profile/PayoutRequestForm";
import BankingProfileTab from "@/components/profile/BankingProfileTab";
import { toast } from "sonner";

interface WalletTabProps {
  user: any;
  walletBalance: number;
  loadingWallet: boolean;
  transactions: any[];
  loadingTransactions: boolean;
  downloadingId: string | null;
  downloadInvoice: (id: string) => Promise<void>;
  fetchWalletBalance: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  user,
  walletBalance,
  loadingWallet,
  transactions,
  loadingTransactions,
  downloadingId,
  downloadInvoice,
  fetchWalletBalance,
  fetchTransactions,
}) => {
  const [showPayoutForm, setShowPayoutForm] = useState<boolean>(false);

  const handlePayoutSubmitted = useCallback(async () => {
    await fetchWalletBalance();
    await fetchTransactions();
    setShowPayoutForm(false);
  }, [fetchWalletBalance, fetchTransactions]);

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
      link.setAttribute("download", `wallet_transactions_${user?.id ?? "unknown"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error("Failed to export transactions");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <BankingProfileTab />
    </div>
  );
};
