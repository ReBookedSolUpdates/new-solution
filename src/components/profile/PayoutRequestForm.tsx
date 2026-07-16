import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { PayoutService } from "@/services/payoutService";
import { useBanking } from "@/hooks/useBanking";
import BankingDetailsRequiredModal from "./BankingDetailsRequiredModal";
import { toast } from "sonner";

interface PayoutRequestFormProps {
  availableBalance: number;
  onSubmitted: () => void;
  onCancel: () => void;
}

const PayoutRequestForm: React.FC<PayoutRequestFormProps> = ({
  availableBalance,
  onSubmitted,
  onCancel,
}) => {
  const { bankingDetails, isLoading: bankingLoading, refreshBankingDetails } = useBanking();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showBankingModal, setShowBankingModal] = useState(false);
  const [bankingCheckComplete, setBankingCheckComplete] = useState(false);

  const hasBankingDetails = !!bankingDetails && bankingDetails.status === "active";

  // Check banking details on mount
  useEffect(() => {
    if (!bankingLoading) {
      if (!hasBankingDetails) {
        setShowBankingModal(true);
      } else {
        setBankingCheckComplete(true);
      }
    }
  }, [bankingLoading, hasBankingDetails]);

  const amountValue = amount ? parseFloat(amount) : 0;
  const isValid = amountValue >= 100 && amountValue <= (availableBalance || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amountValue < 100) {
      toast.error("Minimum withdrawal amount is R100.00");
      return;
    }

    if (!isValid) {
      toast.error("Invalid amount");
      return;
    }

    if (!hasBankingDetails) {
      setShowBankingModal(true);
      toast.error("Please add banking details first");
      return;
    }

    try {
      setLoading(true);
      const result = await PayoutService.createPayoutRequest({
        amount: amountValue,
        notes: notes || undefined,
      });

      if (result.success) {
        setSubmitted(true);
        toast.success("Payout request created successfully!");
        setTimeout(() => {
          onSubmitted();
        }, 2000);
      } else {
        toast.error(result.error || "Failed to create payout request");
      }
    } catch (error) {
      toast.error("An error occurred while creating the payout request");
    } finally {
      setLoading(false);
    }
  };

  const handleBankingDetailsAdded = () => {
    setShowBankingModal(false);
    setBankingCheckComplete(true);
    // Refresh banking details so hasBankingDetails updates
    refreshBankingDetails();
  };

  // Show loading state while checking banking details
  if (!bankingCheckComplete && bankingLoading) {
    return (
      <Dialog open={true} onOpenChange={onCancel}>
        <DialogContent className="w-[88vw] max-w-sm rounded-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (submitted) {
    return (
      <Dialog open={true} onOpenChange={onCancel}>
        <DialogContent className="w-[88vw] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Payout Request Submitted
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center py-3">
              <div className="bg-green-100 rounded-full p-3 mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-muted-foreground text-center text-sm">
                Your payout request for <strong>{PayoutService.formatZAR(amountValue)}</strong> has been submitted.
              </p>
            </div>

            <Alert className="border-primary/20 bg-primary/5">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Our team will verify and process your payout within 2-3 business days.
              </AlertDescription>
            </Alert>

            <Button
              onClick={onCancel}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {/* Banking Details Required Modal */}
      <BankingDetailsRequiredModal
        open={showBankingModal}
        onClose={() => {
          setShowBankingModal(false);
          onCancel();
        }}
        onBankingDetailsAdded={handleBankingDetailsAdded}
      />

      {/* Payout Request Form */}
      <Dialog open={!showBankingModal} onOpenChange={onCancel}>
        <DialogContent className="w-[88vw] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Request Payout</DialogTitle>
            <DialogDescription className="text-sm">
              Withdraw funds from your available balance
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Balance Info */}
            <Alert className="bg-primary/5 border-primary/20">
              <AlertDescription className="text-sm">
                <strong>Available:</strong> {PayoutService.formatZAR(availableBalance)}
              </AlertDescription>
            </Alert>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Amount (ZAR)
              </label>
              <Input
                type="number"
                step="0.01"
                min="100"
                max={availableBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (min R100)"
                disabled={loading || availableBalance < 100}
                className="border-border"
              />
              {availableBalance < 100 && (
                <p className="text-xs text-destructive font-semibold">
                  Minimum withdrawal amount is R100.00. Your balance is too low.
                </p>
              )}
              {amount && !isValid && availableBalance >= 100 && (
                <p className="text-xs text-destructive font-semibold">
                  Amount must be between R100.00 and {PayoutService.formatZAR(availableBalance)}
                </p>
              )}
              {amount && isValid && (
                <p className="text-xs text-primary font-semibold">
                  ✓ Valid amount
                </p>
              )}
            </div>

            {/* Notes Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Notes (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
                disabled={loading}
                className="border-border resize-none"
                rows={2}
              />
            </div>

            {/* Processing Info */}
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-xs">
                Payouts are processed within 2-3 business days to your registered bank account.
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <DialogFooter className="gap-2 sm:gap-0 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 rounded-xl"
                disabled={!isValid || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PayoutRequestForm;
