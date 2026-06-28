import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Eye, EyeOff, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PasswordVerificationFormProps {
  onVerified: () => void;
  onCancel: () => void;
}

export default function PasswordVerificationForm({ onVerified, onCancel }: PasswordVerificationFormProps) {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        throw new Error("No active session found");
      }

      // Attempt to sign in with the provided password to verify it
      const { data, error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: password,
      });

      if (error) {
        if (error.message.includes("Invalid") || error.message.includes("password")) {
          setError("Incorrect password. Please try again.");
        } else {
          setError("Password verification failed. Please try again.");
        }
        return;
      }

      if (data.user) {
        toast.success("Password verified successfully");
        onVerified();
      } else {
        setError("Password verification failed. Please try again.");
      }
    } catch (err: any) {
      setError("An error occurred during verification. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleVerifyPassword} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-900">
            Confirm Your Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`pl-10 pr-10 h-11 rounded-lg border transition-colors ${
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-200 focus:border-book-500 focus:ring-book-500"
              }`}
              placeholder="Enter your password"
              required
              disabled={isVerifying}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isVerifying}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
        </div>

        <div className="flex gap-3 pt-3">
          <Button
            type="submit"
            disabled={isVerifying || !password.trim()}
            className="flex-1 h-10 bg-book-600 hover:bg-book-700 text-white font-medium rounded-lg"
          >
            {isVerifying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Verifying...
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isVerifying}
            className="flex-1 h-10 rounded-lg"
          >
            Cancel
          </Button>
        </div>
      </form>

      <p className="text-xs text-gray-500 text-center leading-relaxed">
        We need to verify your password for security before updating banking details
      </p>
    </div>
  );
}
