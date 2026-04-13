import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/utils/edgeFunctionClient";
import debugLogger from "@/utils/debugLogger";
import {
  Profile,
  loginUser,
  fetchUserProfile,
  fetchUserProfileQuick,
  logoutUser,
} from "@/services/authOperations";
import { logError, getErrorMessage } from "@/utils/errorUtils";
import { SessionTrackingUtils } from "@/utils/sessionTrackingUtils";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  status: string;
  profile_picture_url?: string;
  bio?: string;
  created_at?: string;
  preferred_delivery_locker_data?: any;
  phone_number?: string;
}

// ─── Single consolidated auth state ────────────────────────────────────────────
// Combining into ONE object means ONE setState call = ONE re-render on login.
interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
}

const INITIAL_AUTH_STATE: AuthState = {
  user: null,
  profile: null,
  session: null,
  isLoading: true,
};
// ───────────────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  initError: string | null;
  isCheckingProfile: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    affiliateCode?: string,
  ) => Promise<{ needsVerification?: boolean; isExistingUnverified?: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider. Check your component tree structure.");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const [initError, setInitError] = useState<string | null>(null);
  // isCheckingProfile never needs to cause a re-render — use ref only
  const isCheckingProfileRef = useRef(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  // Guards to prevent double-init from initAuth + onAuthStateChange both firing
  const authInitializedRef = useRef(false);
  const handlingAuthRef = useRef(false);

  const isAuthenticated = !!authState.user && !!authState.session;
  const isAdmin = authState.profile?.isAdmin === true;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const buildFallbackProfile = (user: User): UserProfile => ({
    id: user.id,
    name: user.user_metadata?.name ||
      [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ") ||
      user.email?.split("@")[0] || "User",
    email: user.email || "",
    isAdmin: false,
    status: "active",
    profile_picture_url: user.user_metadata?.avatar_url,
    bio: undefined,
    created_at: user.created_at,
  });

  // ─── handleAuthStateChange ─────────────────────────────────────────────────
  // Called once on init and on SIGNED_IN / SIGNED_OUT.
  // Key design: only ONE setAuthState call per flow = one re-render.
  const handleAuthStateChange = useCallback(async (session: Session | null) => {
    if (session?.user) {
      const fallback = buildFallbackProfile(session.user);

      // ① One batched update: user + session + fallback profile → ONE render
      setAuthState({
        user: session.user,
        session,
        profile: fallback,
        isLoading: false,
      });

      // ② Load the real profile — this is slightly async but happens fast.
      //    We defer background tasks so they never block the paint.
      (async () => {
        try {
          const quick = await fetchUserProfileQuick(session.user!);
          const finalProfile = quick ?? await fetchUserProfile(session.user!);

          if (finalProfile && finalProfile.id === session.user!.id) {
            // ③ One more update with real profile. This is unavoidable but
            //    happens after the page already painted — not a "glitch".
            setAuthState(prev => ({ ...prev, profile: finalProfile }));
          }

          // ④ All background tasks run AFTER state is settled with setTimeout — 
          //    they never cause visible glitching even if they setState.
          setTimeout(async () => {
            const uid = session.user!.id;
            const userMeta = session.user?.user_metadata as any;

            // Phone sync
            try {
              let phone = (userMeta?.phone_number || userMeta?.phone || "").toString().trim();
              if (!phone) {
                try {
                  const cached = localStorage.getItem("pending_phone_number");
                  if (cached) { phone = cached.trim(); localStorage.removeItem("pending_phone_number"); }
                } catch (_) {}
              }
              if (phone) {
                await supabase.auth.updateUser({ data: { phone_number: phone, phone } }).catch(() => {});
                await supabase.from("profiles").update({ phone_number: phone } as any).eq("id", uid).then(() => {}).catch(() => {});
              }
            } catch (_) {}

            // Profile completeness + address prefetch (all in one block)
            try {
              isCheckingProfileRef.current = true;
              setIsCheckingProfile(true);
              const { getUserAddresses } = await import("@/services/addressService");
              const addressData = await getUserAddresses(uid);

              // Cache address for snappy UI
              if (addressData) {
                try { localStorage.setItem(`cached_address_${uid}`, JSON.stringify(addressData)); } catch (_) {}
              }

              // Prefetch banking / subaccount — cache only, no state updates
              Promise.allSettled([
                import("@/services/bankingService").then(m => m.BankingService.getSellerRequirements(uid)),
                import("@/services/paystackSubaccountService").then(m => m.PaystackSubaccountService.getUserSubaccountStatus(uid)),
              ]).then(([bankRes, subRes]) => {
                if (bankRes.status === "fulfilled") {
                  try { localStorage.setItem(`banking_requirements_${uid}`, JSON.stringify(bankRes.value)); } catch (_) {}
                }
                if (subRes.status === "fulfilled") {
                  try { localStorage.setItem(`subaccount_status_${uid}`, JSON.stringify(subRes.value)); } catch (_) {}
                }
              }).catch(() => {});
            } catch (_) {
            } finally {
              isCheckingProfileRef.current = false;
              setIsCheckingProfile(false);
            }
          }, 300); // Defer background work until after render settles

        } catch (_) {
          // Background profile load failed — fallback stays visible, that's fine
        }
      })();

    } else {
      // Signed out — one update clears everything
      setAuthState({ ...INITIAL_AUTH_STATE, isLoading: false });
    }
  }, []); // No deps — uses setAuthState updater form to avoid stale closures

  // ─── Initialize auth (runs once) ──────────────────────────────────────────
  useEffect(() => {
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    const initAuth = async () => {
      try {
        SessionTrackingUtils.initializeSession();

        let sessionResult;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            sessionResult = await supabase.auth.getSession();
            break;
          } catch (err) {
            if (attempt === 2) throw err;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }
        }

        if (!sessionResult) throw new Error("Failed to get session");

        const { data: { session }, error } = sessionResult;

        if (error && !error.message.includes("code verifier")) {
          setInitError(error.message.includes("fetch") ? "Network connectivity issues" : error.message);
        }

        handlingAuthRef.current = true;
        await handleAuthStateChange(session);
        handlingAuthRef.current = false;

      } catch (err) {
        const msg = getErrorMessage(err, "Failed to initialize authentication");
        setInitError(msg.includes("fetch") ? "Network connectivity issues" : msg);
        setAuthState({ ...INITIAL_AUTH_STATE, isLoading: false });
        handlingAuthRef.current = false;
      }
    };

    initAuth();
  }, [handleAuthStateChange]);

  // ─── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED") {
        // Only update the session token — never re-render everything
        if (session) setAuthState(prev => ({ ...prev, session }));
        return;
      }

      if (event === "SIGNED_IN") {
        // Skip if initAuth already handled this (prevents double-init glitch)
        if (handlingAuthRef.current) return;
        await handleAuthStateChange(session);
        return;
      }

      if (event === "SIGNED_OUT") {
        await handleAuthStateChange(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [handleAuthStateChange]);

  // ─── Auth actions ──────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const result = await loginUser(email, password);
      // Auth state change listener (SIGNED_IN) will update everything else.
      // Add a tiny buffer so the listener fires before we stop loading.
      await new Promise(r => setTimeout(r, 200));
      return result;
    } catch (error) {
      // Check if user is actually authenticated despite the error
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) return data;
      } catch (_) {}
      setAuthState(prev => ({ ...prev, isLoading: false }));
      const msg = getErrorMessage(error, "Login failed. Please try again.");
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (
    email: string, password: string,
    firstName: string, lastName: string,
    phone: string, affiliateCode?: string,
  ) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Check existing profile
      const { data: existing } = await supabase.from("profiles").select("id,email").eq("email", email).maybeSingle();
      if (existing) {
        try {
          const { error: resendErr } = await supabase.auth.resend({
            type: "signup", email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });
          if (!resendErr) return { needsVerification: true, isExistingUnverified: true };
          if (resendErr.message?.includes("already confirmed")) {
            throw new Error("Your account already exists and is fully verified. Please log in instead.");
          }
        } catch (_) {}
        throw new Error("An account with this email already exists. Please try logging in instead.");
      }

      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { first_name: firstName, last_name: lastName, phone_number: phone, phone, ...(affiliateCode ? { affiliate_code: affiliateCode } : {}) },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      // Track referral
      try {
        if (affiliateCode && data?.user?.id) {
          await callEdgeFunction("track-referral", { method: "POST", body: { affiliate_code: affiliateCode, new_user_id: data.user.id } });
        }
      } catch (_) {}

      try { localStorage.setItem("pending_phone_number", phone); } catch (_) {}

      if (error) {
        if (error.message?.includes("already registered") || error.message?.includes("already exists")) {
          try {
            const { error: resendErr } = await supabase.auth.resend({
              type: "signup", email,
              options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
            });
            if (!resendErr) return { needsVerification: true, isExistingUnverified: true };
          } catch (_) {}
          throw new Error("An account with this email already exists. Please try logging in instead.");
        }
        throw new Error(error.message);
      }

      if (data.user && !data.session) {
        // Email verification required — resend confirmation email
        try {
          await supabase.auth.resend({
            type: "signup", email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });
        } catch (_) {}

        // Brevo contact (non-blocking)
        callEdgeFunction("create-brevo-contact", {
          method: "POST", body: { email, firstName, lastName, phone, updateIfExists: true },
        }).catch(() => {});

        return { needsVerification: true };
      }

      if (data.user && data.session) {
        callEdgeFunction("create-brevo-contact", {
          method: "POST", body: { email, firstName, lastName, phone, updateIfExists: true },
        }).catch(() => {});
        return { needsVerification: false };
      }

      return { needsVerification: false };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Registration failed";
      if (msg.includes("already registered") || msg.includes("already exists")) {
        throw new Error("An account with this email already exists. Please try logging in instead.");
      }
      throw new Error(msg);
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      if (authState.user?.id) {
        try { await logoutUser(authState.user.id); } catch (_) {}
      }
    } finally {
      setAuthState({ ...INITIAL_AUTH_STATE, isLoading: false });
    }
  }, [authState.user?.id]);

  const refreshProfile = useCallback(async () => {
    if (!authState.user) return;
    try {
      const updated = await fetchUserProfile(authState.user);
      if (updated) setAuthState(prev => ({ ...prev, profile: updated }));
    } catch (_) {}
  }, [authState.user]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // ─── Context value — only changes when authState actually changes ───────────
  const value = useMemo(() => ({
    user: authState.user,
    profile: authState.profile,
    session: authState.session,
    isLoading: authState.isLoading,
    isAuthenticated,
    isAdmin,
    initError,
    isCheckingProfile,
    login,
    register,
    logout,
    refreshProfile,
    signInWithGoogle,
  }), [
    authState,
    isAuthenticated,
    isAdmin,
    initError,
    isCheckingProfile,
    login,
    register,
    logout,
    refreshProfile,
    signInWithGoogle,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
