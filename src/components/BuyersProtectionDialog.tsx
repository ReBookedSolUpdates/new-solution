import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  Lock,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import "./BuyersProtectionDialog.css";

interface BuyersProtectionDialogProps {
  triggerClassName?: string;
  triggerVariant?: "link" | "ghost" | "secondary" | "outline" | "default" | "destructive";
  triggerLabel?: string;
  triggerProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  triggerType?: "button" | "banner";
}

const BuyersProtectionDialog = ({
  triggerClassName,
  triggerVariant = "outline",
  triggerLabel = "Buyer Protection",
  triggerProps,
  triggerType = "button",
}: BuyersProtectionDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerType === "banner" ? (
          <button
            type="button"
            {...(triggerProps as any)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 transition-colors hover:bg-green-100",
              triggerClassName,
            )}
            aria-label={triggerLabel}
          >
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-green-600" />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-gray-900">{triggerLabel}</div>
              <div className="text-xs text-gray-600">Applied to all purchases</div>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-green-600" />
          </button>
        ) : (
          <Button
            variant={triggerVariant}
            size="sm"
            className={cn("gap-2 rounded-md px-3 py-1", triggerClassName)}
            {...triggerProps}
          >
            <ShieldCheck className="h-4 w-4" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="buyers-protection-dialog mx-auto max-h-[85vh] w-[calc(100vw-1rem)] max-w-xs overflow-y-auto rounded-2xl p-2 sm:max-w-2xl sm:p-6">
        <DialogHeader className="rounded-[1.5rem] border border-emerald-100 bg-[linear-gradient(135deg,_#ecfdf5,_#ffffff_55%,_#f0fdf4)] p-4 sm:p-6">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Protected checkout
          </div>
          <DialogTitle className="flex items-center gap-3 text-left text-lg sm:text-2xl">
            <div className="rounded-2xl bg-emerald-100 p-3">
              <ShieldCheck className="h-5 w-5 text-emerald-700 sm:h-6 sm:w-6" />
            </div>
            <span>Buyer Protection</span>
          </DialogTitle>
          <DialogDescription className="mt-3 text-left text-sm leading-6 text-gray-600 sm:text-base">
            Every purchase on ReBooked Solutions is covered from payment to delivery. We hold the transaction safely, help if something goes wrong, and only release funds once the order process is properly completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-1 pt-4 sm:space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-3 inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <Wallet className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900 sm:text-base">Funds are held securely</h3>
              <p className="mt-2 text-xs leading-6 text-stone-600 sm:text-sm">
                Your payment is not sent straight to the seller. It stays protected in the transaction flow while the order is being completed.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-3 inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900 sm:text-base">Refund support when needed</h3>
              <p className="mt-2 text-xs leading-6 text-stone-600 sm:text-sm">
                If the seller never ships, or the item significantly differs from the listing, you can raise the issue and our team will step in.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-3 inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <Headphones className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900 sm:text-base">Human support is available</h3>
              <p className="mt-2 text-xs leading-6 text-stone-600 sm:text-sm">
                If something feels off, you are not left alone. Our support team can review order context, delivery progress, and dispute details.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-3 inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <Lock className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900 sm:text-base">Encrypted payment handling</h3>
              <p className="mt-2 text-xs leading-6 text-stone-600 sm:text-sm">
                Payments are processed through integrated partners using secure, encrypted flows designed for protected online transactions.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2 text-amber-700">
                <ReceiptText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-900 sm:text-base">What the R20 fee covers</h3>
                <p className="mt-2 text-xs leading-6 text-amber-900/80 sm:text-sm">
                  The buyer protection fee helps cover payment processing, transaction monitoring, buyer support, and the platform processes that keep orders safer.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center text-xs text-gray-600 sm:text-sm">
            <p>
              Having payment issues?{" "}
              <a href="mailto:info@rebookedsolutions.co.za" className="font-medium text-book-700 hover:underline">
                info@rebookedsolutions.co.za
              </a>
            </p>
            <p>
              Need more help?{" "}
              <a
                href="https://support.rebookedsolutions.co.za"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
              >
                Visit our Support Portal
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </p>
          </div>
        </div>

        <div className="mt-3 border-t pt-3 sm:mt-4">
          <DialogClose asChild>
            <Button variant="outline" className="w-full py-2 text-xs sm:py-2.5 sm:text-sm">
              I Understand
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyersProtectionDialog;
