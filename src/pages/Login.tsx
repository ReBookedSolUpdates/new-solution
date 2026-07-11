import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOAuthRedirect } from "@/hooks/useOAuthRedirect";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import debugLogger from "@/utils/debugLogger";
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Key,
  UserPlus,
  RefreshCw,
  BookOpen,
  Book,
} from "lucide-react";

const Login = () => {
  debugLogger.info("Login", "Login page mounted");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    "verify_email" | "register" | "reset_password" | "general" | null
  >(null);
  const { login, signInWithGoogle, isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check client-side cached business status for instant redirect
  useEffect(() => {
    if (localStorage.getItem("is_business_user") === "true") {
      navigate("/business-profile", { replace: true });
    }
  }, [navigate]);

  // Only handle OAuth redirect if there are actual OAuth parameters in the URL
  const hasOAuthParams =
    location.hash.includes("access_token") ||
    location.search.includes("code=") ||
    location.search.includes("error=");

  useOAuthRedirect({
    redirectTo: "/",
    showNotifications: hasOAuthParams, // Only show notifications if this is actually an OAuth redirect
  });

  useEffect(() => {
    window.scrollTo(0, 0);

    // Show message from registration redirect
    if (location.state?.message) {
      toast.info(location.state.message);
      if (location.state?.email) {
        setEmail(location.state.email);
      }
    }
  }, [location.state]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (profile?.isBusiness || localStorage.getItem("is_business_user") === "true") {
        navigate("/business-profile", { replace: true });
      } else {
        navigate("/profile", { replace: true });
      }
    }
  }, [isAuthenticated, profile, navigate]);

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address first");
      return;
    }

    setIsLoading(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");

      // Use the same reliable method as password reset
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {

        // Provide user-friendly error message
        if (error.message.includes("Email not found") || error.message.includes("user not found")) {
          toast.error("No account found with this email address. Please register first.");
          setErrorType("register");
          return;
        }

        if (error.message.includes("email already confirmed")) {
          toast.success("Your email is already verified! You can log in normally.");
          setLoginError(null);
          setErrorType(null);
          return;
        }

        // Generic error - still try to help user
        toast.error(
          "Unable to resend verification email. Please contact support if this continues.",
        );
      } else {
        toast.success(
          "📧 Verification email sent! Please check your inbox and spam folder.",
        );
        setLoginError(null);
        setErrorType(null);
      }
    } catch (error) {
      toast.error("Failed to resend verification email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    debugLogger.info("Login", "Login attempt submitted", { email });

    setIsLoading(true);
    setLoginError(null);
    setErrorType(null);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error("Email and password are required");
      }

      debugLogger.info("Login", "Authenticating user");
      const result = await login(email, password);
      debugLogger.info("Login", "Login successful, redirecting to profile");

      // Give a moment for auth state to update, then check if we're authenticated
      setTimeout(() => {
        if (isAuthenticated) {
          if (profile?.isBusiness || localStorage.getItem("is_business_user") === "true") {
            navigate("/business-profile", { replace: true });
          } else {
            navigate("/profile", { replace: true });
          }
        }
      }, 100);

    } catch (error: unknown) {
      // Before showing error, double-check if user is actually authenticated
      // Sometimes login succeeds but throws an error due to network issues
      setTimeout(async () => {
        if (isAuthenticated) {
          toast.success("Login successful!");
          if (profile?.isBusiness || localStorage.getItem("is_business_user") === "true") {
            navigate("/business-profile", { replace: true });
          } else {
            navigate("/profile", { replace: true });
          }
          return;
        }

        // Only show error if user is definitely not authenticated
        const errorMessage =
          error instanceof Error ? error.message : "Login failed";

        setLoginError(errorMessage);

        // Determine error type for better UX
        if (
          errorMessage.includes("verification") ||
          errorMessage.includes("verified")
        ) {
          setErrorType("verify_email");
        } else if (
          errorMessage.includes("No account") ||
          errorMessage.includes("not found")
        ) {
          setErrorType("register");
        } else if (
          errorMessage.includes("password") ||
          errorMessage.includes("credentials")
        ) {
          setErrorType("reset_password");
        } else {
          setErrorType("general");
        }

        setIsLoading(false);
      }, 500); // Give auth state time to update

    }
  };

  const renderErrorCard = () => {
    if (!loginError) return null;

    const getErrorIcon = () => {
      switch (errorType) {
        case "verify_email":
          return <Mail className="h-5 w-5 text-orange-500" />;
        case "reset_password":
          return <Key className="h-5 w-5 text-yellow-500" />;
        case "register":
          return <UserPlus className="h-5 w-5 text-blue-500" />;
        default:
          return <AlertCircle className="h-5 w-5 text-red-500" />;
      }
    };

    const getErrorTitle = () => {
      switch (errorType) {
        case "verify_email":
          return "Email Verification Required";
        case "reset_password":
          return "Password Issue";
        case "register":
          return "Account Not Found";
        default:
          return "Login Failed";
      }
    };

    return (
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardContent className="p-4">
          <Alert>
            <div className="flex items-start space-x-3">
              {getErrorIcon()}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">
                  {getErrorTitle()}
                </h4>
                <AlertDescription className="text-gray-700 mb-4">
                  {loginError}
                </AlertDescription>

                {errorType === "verify_email" && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-sm text-orange-800">
                      <p className="font-medium mb-2">
                        📧 Email Verification Steps:
                      </p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          Check your inbox for an email from ReBooked Solutions
                        </li>
                        <li>If not found, check your spam/junk folder</li>
                        <li>Click the verification link in the email</li>
                        <li>Return here to log in</li>
                      </ol>
                    </div>
                  </div>
                )}

                {errorType === "register" && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">💡 Account Not Found</p>
                      <p>
                        No account exists with the email:{" "}
                        <strong>{email}</strong>
                      </p>
                      <p>
                        Please check the email address or create a new account.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {errorType === "verify_email" && (
                    <Button
                      onClick={handleResendVerification}
                      className="w-full"
                      variant="default"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Verification Email
                    </Button>
                  )}

                  {errorType === "reset_password" && (
                    <Button
                      onClick={() =>
                        navigate("/forgot-password", { state: { email } })
                      }
                      className="w-full"
                      variant="default"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>
                  )}

                  {errorType === "register" && (
                    <Button
                      onClick={() =>
                        navigate("/register", { state: { email } })
                      }
                      className="w-full"
                      variant="default"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account
                    </Button>
                  )}

                  <Button
                    onClick={() => {
                      setLoginError(null);
                      setErrorType(null);
                      // Focus on password field for retry
                      setTimeout(() => {
                        const passwordInput =
                          document.getElementById("password");
                        if (passwordInput) {
                          passwordInput.focus();
                        }
                      }, 100);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {renderErrorCard()}

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 sm:p-8">
              <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">
                Login to ReBooked Solutions
              </h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 h-12 border-gray-300 focus:border-book-500 focus:ring-book-500 rounded-lg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700"
                    >
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-book-600 hover:text-book-800 font-medium transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-12 border-gray-300 focus:border-book-500 focus:ring-book-500 rounded-lg"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 group"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <div className="relative transform-gpu">
                        {showPassword ? (
                          <BookOpen
                            className="h-5 w-5 text-book-500 hover:text-book-600 transition-all duration-500 ease-out transform hover:scale-110 animate-pulse"
                            style={{
                              filter: 'drop-shadow(0 2px 4px rgba(34, 197, 94, 0.2))',
                              animation: 'bookOpen 0.5s ease-out'
                            }}
                          />
                        ) : (
                          <Book
                            className="h-5 w-5 text-gray-400 hover:text-book-500 transition-all duration-300 ease-in-out transform hover:scale-110"
                            style={{
                              animation: 'bookClose 0.3s ease-in-out'
                            }}
                          />
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-book-600 hover:bg-book-700 text-white font-medium rounded-lg transition-colors btn-mobile"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Log in"
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
                  className="w-full border-gray-300 h-12 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center font-medium rounded-lg"
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

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="text-book-600 hover:text-book-800 font-medium transition-colors"
                  >
                    Sign up
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

export default Login;
