import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, User, Loader2, BookOpen, Book } from "lucide-react";
import { BackupEmailService } from "@/utils/backupEmailService";
import { callEdgeFunction } from "@/utils/edgeFunctionClient";
import { sendRegistrationWebhook } from "@/utils/registrationWebhook";

// Affiliate tracking storage key
const AFFILIATE_STORAGE_KEY = 'affiliate_code';

const setStoredAffiliateCode = (code: string) => {
  try {
    localStorage.setItem(AFFILIATE_STORAGE_KEY, code);
    // set cookie for 30 days
    document.cookie = `${AFFILIATE_STORAGE_KEY}=${encodeURIComponent(code)};path=/;max-age=${30*24*60*60}`;
  } catch (e) {
    // ignore
  }
};

const getStoredAffiliateCode = (): string | null => {
  try {
    const ls = localStorage.getItem(AFFILIATE_STORAGE_KEY);
    if (ls) return ls;
    const match = document.cookie.match(new RegExp('(?:^|; )' + AFFILIATE_STORAGE_KEY + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch (e) {
    return null;
  }
};


const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const normalizePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (value.trim().startsWith("+27")) {
      return ("0" + digits.slice(2)).slice(0, 10);
    }
    if (digits.startsWith("27")) {
      return ("0" + digits.slice(2)).slice(0, 10);
    }
    return digits.slice(0, 10);
  };
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const { register, signInWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Capture affiliate code from URL ?ref= on first render and store it
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        setStoredAffiliateCode(ref);
        // Remove ref param from URL for cleanliness
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Starting registration process - sensitive data not logged

    try {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !phone.trim()) {
        throw new Error("All fields are required");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Normalize to 0XXXXXXXXX format and validate length
      const normalizedPhone = normalizePhone(phone);
      setPhone(normalizedPhone);
      if (!/^0\d{9}$/.test(normalizedPhone)) {
        const proceed = window.confirm(
          "Are you sure your number is correct? South African numbers should start with 0 and be 10 digits. It's used for delivery; if incorrect, couriers may not reach you and you may need to pay for rescheduling."
        );
        if (!proceed) {
          setIsLoading(false);
          return;
        }
      }

      const affiliateCode = getStoredAffiliateCode();
      const result = await register(email, password, firstName, lastName, normalizedPhone, affiliateCode ?? undefined);

      // Send registration data to webhook (non-blocking)
      try {
        await sendRegistrationWebhook({
          firstName,
          lastName,
          email,
          phone: normalizedPhone,
          ...(affiliateCode && { affiliateCode }),
        });
      } catch (webhookError) {
        // Webhook call failed - continue with signup
      }

      // Call Brevo to create contact after successful signup (non-blocking)
      if (result?.needsVerification || (result as any)?.emailWarning) {
        try {
          await callEdgeFunction('create-brevo-contact', {
            method: 'POST',
            body: {
              email,
              firstName,
              lastName,
              phone: normalizedPhone,
              updateIfExists: true,
            }
          });
        } catch (brevoError) {
          // Brevo contact creation failed - continue with signup
        }
      }

      // Handle different registration outcomes
      if (result?.needsVerification) {
        if (result?.isExistingUnverified) {
          // Existing user who needs verification
          toast.info("Account found! Verification email resent.", {
            duration: 4000,
          });

          toast.info(
            "Please check your email for the verification link. Check spam/junk folder if you don't see it.",
            {
              duration: 8000,
            },
          );
        } else {
          // New account created
          toast.success("Account created successfully! Welcome to ReBooked Solutions.", {
            duration: 4000,
          });

          toast.info(
            "Please check your email for the verification link. Check spam/junk folder if you don't see it.",
            {
              duration: 8000,
            },
          );
        }

        // Set email sent state to show confirmation UI
        setEmailSent(true);
        setUserEmail(email);

        setTimeout(() => {
          navigate("/login", {
            state: {
              message: result?.isExistingUnverified
                ? "Your account needs email verification. Check your email for the verification link."
                : "Account created! Please check your email for the verification link. You can resend the email if needed.",
              email,
            },
          });
        }, 3000);
      } else if ((result as any)?.emailWarning) {
        // Registration successful but email confirmation may have failed
        toast.success("Account created successfully! You can now log in.", {
          duration: 4000,
        });
        toast.info(
          "📧 Note: Email confirmation service is temporarily unavailable, but your account is fully functional!",
          {
            duration: 8000,
          },
        );

        setTimeout(() => {
          navigate("/login", {
            state: {
              message:
                "Your account has been created successfully. You can now log in.",
              email,
            },
          });
        }, 2000);
      } else {
        // Direct login (no email verification needed)
        toast.success("Registration successful! You are now logged in.", {
          duration: 4000,
        });

        setTimeout(() => {
          navigate("/profile", { replace: true });
        }, 1000);
      }
    } catch (error: unknown) {
      // Handle registration errors

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.";

      // Handle specific error types with better user guidance
      if (errorMessage.includes("already exists") || errorMessage.includes("already registered")) {
        toast.error("Account Already Exists", {
          duration: 6000,
        });

        toast.info(
          "📧 An account with this email already exists. Please try logging in instead. If you forgot your password, use the 'Forgot Password' option.",
          {
            duration: 8000,
          }
        );

        // Redirect to login with the email prefilled
        setTimeout(() => {
          navigate("/login", {
            state: {
              message: "Account already exists. Please log in or reset your password if needed.",
              email,
            },
          });
        }, 2000);
      } else if (
        errorMessage.toLowerCase().includes("email") ||
        errorMessage.toLowerCase().includes("confirmation") ||
        errorMessage.toLowerCase().includes("smtp") ||
        errorMessage.toLowerCase().includes("mail") ||
        errorMessage.toLowerCase().includes("supabase")
      ) {
        // Show user-friendly message for email service issues
        toast.error("📧 Email Service Configuration Required", {
          duration: 8000,
        });

        toast.info(
          "The email confirmation system needs to be set up by an administrator. " +
          "Please contact support or try again later once the email service is configured.",
          {
            duration: 10000,
          }
        );

      } else {
        // Show the error to the user
        toast.error(errorMessage, {
          duration: 6000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-sm md:max-w-md">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-5 sm:p-6">
              <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
                Create an Account
              </h1>

              {emailSent && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <Mail className="h-5 w-5" />
                    <span className="font-medium">Email Sent Successfully!</span>
                  </div>
                  <p className="text-green-700 text-sm mt-2">
                    A confirmation email has been sent to <strong>{userEmail}</strong>.
                    Please check your inbox (and spam folder) for the verification link.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                          id="first_name"
                          type="text"
                          placeholder="John"
                          className="pl-10"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                          id="last_name"
                          type="text"
                          placeholder="Doe"
                          className="pl-10"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="e.g., 0812345678"
                      value={phone}
                      onChange={(e) => setPhone(normalizePhone(e.target.value))}
                      required
                    />
                    {phone && !/^0\d{9}$/.test(phone) && (
                      <p className="text-xs text-amber-600 mt-1">
                        South African numbers should start with 0 and be 10 digits. Please double-check.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 group"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <div className="relative">
                        {showPassword ? (
                          <BookOpen className="h-5 w-5 text-book-500 hover:text-book-600 transition-all duration-300 ease-in-out transform hover:scale-110 book-open-animation" />
                        ) : (
                          <Book className="h-5 w-5 text-gray-400 hover:text-book-500 transition-all duration-300 ease-in-out transform hover:scale-110 book-close-animation" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 group"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      <div className="relative">
                        {showConfirmPassword ? (
                          <BookOpen className="h-5 w-5 text-book-500 hover:text-book-600 transition-all duration-300 ease-in-out transform hover:scale-110 book-open-animation" />
                        ) : (
                          <Book className="h-5 w-5 text-gray-400 hover:text-book-500 transition-all duration-300 ease-in-out transform hover:scale-110 book-close-animation" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                  By creating an account you are agreeing to ReBooked Solutions{" "}
                  <Link
                    to="/policies"
                    className="text-book-600 hover:text-book-800 underline"
                  >
                    terms and conditions and all policies
                  </Link>
                </p>

                <Button
                  type="submit"
                  className="w-full bg-book-600 hover:bg-book-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500 font-medium">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-300 h-11 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center font-medium rounded-lg"
                  onClick={signInWithGoogle}
                  disabled={isLoading}
                >
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-book-600 hover:text-book-800 font-medium"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Register;
