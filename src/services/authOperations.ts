import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  logError,
  getErrorMessage,
  retryWithExponentialBackoff,
  withTimeout,
  isNetworkError,
} from "@/utils/errorUtils";
import debugLogger from "@/utils/debugLogger";
import { buildDisplayName } from "@/utils/profileUtils";
import { ActivityService } from "@/services/activityService";
import { SessionTrackingUtils } from "@/utils/sessionTrackingUtils";

export interface Profile {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  status: string;
  profile_picture_url?: string;
  bio?: string;
  created_at?: string;
  preferred_delivery_locker_data?: any;
}

export const loginUser = async (email: string, password: string) => {
  debugLogger.info("authOperations", "loginUser called", { email });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    debugLogger.error("authOperations", "Login failed", { email, error: error.message });
    // Create proper Error object with user-friendly message
    let errorMessage = error.message || 'Login failed';

    // Provide specific messages for common errors
    if (errorMessage.includes('Invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please check your credentials and try again.';
    } else if (errorMessage.includes('Email not confirmed')) {
      errorMessage = 'Please verify your email address before logging in. Check your inbox for the verification link.';
    } else if (errorMessage.includes('Too many requests')) {
      errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
    }

    throw new Error(errorMessage);
  }

  // Track login activity (non-blocking)
  if (data.user) {
    debugLogger.info("authOperations", "Login successful", { userId: data.user.id });
    try {
      await ActivityService.trackLogin(data.user.id);
    } catch (trackingError) {
      debugLogger.warn("authOperations", "Error tracking login", trackingError);
    }
  }

  return data;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
) => {
  debugLogger.info("authOperations", "registerUser called", { email, name });

  // First try the standard Supabase signup
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    debugLogger.error("authOperations", "Registration failed", { email, error: error.message });
    // Create proper Error object with user-friendly message
    let errorMessage = error.message || 'Registration failed';

    // Provide specific messages for common registration errors
    if (errorMessage.includes('User already registered') ||
        errorMessage.includes('already registered') ||
        errorMessage.includes('already been registered') ||
        errorMessage.includes('email address is already registered')) {
      errorMessage = 'An account with this email already exists. Please try logging in instead.';
    } else if (errorMessage.includes('Password should be at least')) {
      errorMessage = 'Password must be at least 6 characters long.';
    } else if (errorMessage.includes('Error sending confirmation email')) {
      errorMessage = 'Our email confirmation service is temporarily experiencing issues. Please try again in a few minutes.';
    }

    throw new Error(errorMessage);
  }

  // Track signup activity (non-blocking)
  if (data.user) {
    try {
      await ActivityService.trackSignup(data.user.id);
    } catch (trackingError) {
      // Don't fail signup for tracking errors
      debugLogger.error("authOperations", "Error tracking signup:", trackingError);
    }
  }

  // Subscribe to Brevo + send welcome email via edge function (non-blocking)
  if (data.user) {
    const nameParts = name.split(" ");
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(" ") || "";
    supabase.functions.invoke("add-subscriber", {
      body: { email, firstName, lastName, sendWelcomeEmail: true },
    }).catch(() => {}); // Non-fatal
  }

  return data;
};

// Helper functions for welcome email
const generateWelcomeEmailHTML = (name: string, email: string): string => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Welcome to ReBooked Solutions</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f3fef7; padding: 20px; color: #1f4e3d; }
      .container { max-width: 500px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
      .welcome-box { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 5px; margin: 20px 0; }
      .btn { display: inline-block; padding: 12px 20px; background-color: #3ab26f; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🎉 Welcome to ReBooked Solutions!</h1>

      <div class="welcome-box">
        <strong>✅ Your account has been created successfully!</strong>
      </div>

      <p>Hi ${name}!</p>

      <p>Welcome to South Africa's premier textbook marketplace! Your account is now active and you can:</p>

      <ul>
        <li>📚 Browse thousands of affordable textbooks</li>
        <li>💰 Sell your textbooks to other students</li>
        <li>🚚 Enjoy convenient doorstep delivery</li>
        <li>🎓 Connect with students at your university</li>
      </ul>

      <a href="${window.location.origin}/books" class="btn">Start Browsing Books</a>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 12px; color: #6b7280;">
        <strong>Thank you for joining ReBooked Solutions!</strong><br>
        Account: ${email}<br>
        Support: support@rebookedsolutions.co.za<br>
        <em>"Pre-Loved Pages, New Adventures"</em>
      </p>
    </div>
  </body>
  </html>
`;

const generateWelcomeEmailText = (name: string, email: string): string => `
  Welcome to ReBooked Solutions!

  Hi ${name}!

  Your account has been created successfully! Welcome to South Africa's premier textbook marketplace.

  You can now:
  - Browse thousands of affordable textbooks
  - Sell your textbooks to other students
  - Enjoy convenient doorstep delivery
  - Connect with students at your university

  Visit ${window.location.origin}/books to start browsing!

  Account: ${email}
  Support: support@rebookedsolutions.co.za

  "Pre-Loved Pages, New Adventures"
`;

export const logoutUser = async (userId?: string) => {
  debugLogger.info("authOperations", "logoutUser called", { userId });

  // Track logout activity (non-blocking)
  if (userId) {
    try {
      const sessionDuration = SessionTrackingUtils.getSessionDuration();
      await ActivityService.trackLogout(userId, sessionDuration);
      debugLogger.info("authOperations", "Logout activity tracked", { sessionDuration });
    } catch (trackingError) {
      debugLogger.warn("authOperations", "Error tracking logout", trackingError);
    }
  }

  // Clear session after tracking
  try {
    SessionTrackingUtils.clearSession();
  } catch (clearError) {
    debugLogger.warn("authOperations", "Error clearing session", clearError);
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    debugLogger.error("authOperations", "Logout failed", { error: error.message });
    // Create proper Error object with user-friendly message
    const errorMessage = error.message || 'Logout failed. Please try again.';
    throw new Error(errorMessage);
  }

  debugLogger.info("authOperations", "Logout successful");
};

export const fetchUserProfileQuick = async (
  user: User,
): Promise<Profile | null> => {
  try {

    // Simplified approach with just one try and longer timeout
    const { data: profile, error: profileError } = (await withTimeout(
      supabase
        .from("profiles")
        .select("id, first_name, last_name, name, full_name, email, status, profile_picture_url, bio, is_admin, created_at, preferred_delivery_locker_data")
        .eq("id", user.id)
        .single(),
      12000, // Increased to 12 seconds
      "Quick profile fetch timed out after 12 seconds",
    )) as any;

    if (profileError) {
      // Profile not found is normal for new users
      if (profileError.code === "PGRST116") {
        return null; // Return null so fallback is used
      }

      return null; // Use fallback on any error
    }

    if (!profile) {
      return null; // Use fallback profile
    }

    // Quick admin check without background updates
    const adminEmails = ["AdminSimnLi@gmail.com", "adminsimnli@gmail.com"];
    const userEmail = profile.email || user.email || "";
    const isAdmin =
      profile.is_admin === true ||
      adminEmails.includes(userEmail.toLowerCase());

    const profileData = {
      id: profile.id,
      name: buildDisplayName({ ...profile, email: profile.email || user.email }),
      email: profile.email || user.email || "",
      isAdmin,
      status: profile.status || "active",
      profile_picture_url: profile.profile_picture_url,
      bio: profile.bio,
      created_at: profile.created_at,
      preferred_delivery_locker_data: profile.preferred_delivery_locker_data,
    };

    return profileData;
  } catch (error) {
    // Don't log as error since this is expected to fail sometimes
    // Just use fallback profile
    return null;
  }
};

export const fetchUserProfile = async (user: User): Promise<Profile | null> => {
  debugLogger.info("authOperations", "fetchUserProfile called", { userId: user.id, email: user.email });

  try {

    // Enhanced retry logic with better error handling
    const result = await retryWithExponentialBackoff(
      async () => {
        return await withTimeout(
          supabase
            .from("profiles")
            .select(
              "id, first_name, last_name, name, full_name, email, status, profile_picture_url, bio, is_admin, created_at, preferred_delivery_locker_data",
            )
            .eq("id", user.id)
            .single(),
          10000, // 10 second timeout for full fetch
          "Full profile fetch timed out",
        );
      },
      {
        maxRetries: 2,
        baseDelay: 500,
        maxDelay: 5000,
        retryCondition: (error: any) => isNetworkError(error),
      },
    );

    const { data: profile, error: profileError } = result as any;

    if (profileError) {
      logError("Error fetching profile", profileError);

      if (profileError.code === "PGRST116") {
        return await createUserProfile(user);
      }

      throw new Error(
        getErrorMessage(profileError, "Failed to fetch user profile"),
      );
    }

    if (!profile) {
      return await createUserProfile(user);
    }

    // Check admin status - first check the profile flag, then fallback to email check
    let isAdmin = false;

    if (profile.is_admin === true) {
      isAdmin = true;
    } else {
      // Quick email-based admin check without additional database calls
      const adminEmails = ["AdminSimnLi@gmail.com", "adminsimnli@gmail.com"];
      const userEmail = profile.email || user.email || "";
      isAdmin = adminEmails.includes(userEmail.toLowerCase());

      if (isAdmin) {
        // Update admin flag in background (non-blocking)
        supabase
          .from("profiles")
          .update({ is_admin: true })
          .eq("id", user.id)
          .then(() => {})
          .catch(() => {});
      }
    }

    const displayName = buildDisplayName({ ...profile, email: profile.email || user.email });

    return {
      id: profile.id,
      name: displayName,
      email: profile.email || user.email || "",
      isAdmin,
      status: profile.status || "active",
      profile_picture_url: profile.profile_picture_url,
      bio: profile.bio,
      created_at: profile.created_at,
      preferred_delivery_locker_data: profile.preferred_delivery_locker_data,
    };
  } catch (error) {
    logError("Error in fetchUserProfile", error);
    throw new Error(getErrorMessage(error, "Failed to load user profile"));
  }
};

// Alias used by AuthContext for upgrading/merging existing profiles
export const upgradeToUserProfile = async (user: User): Promise<Profile | null> => {
  try {
    return await fetchUserProfileQuick(user);
  } catch {
    return null;
  }
};

export const createUserProfile = async (user: User): Promise<Profile> => {
  debugLogger.info("authOperations", "createUserProfile called", { userId: user.id, email: user.email });

  try {

    // Check if user should be admin based on email
    const adminEmails = ["AdminSimnLi@gmail.com", "adminsimnli@gmail.com"];
    const userEmail = user.email || "";
    const isAdmin = adminEmails.includes(userEmail.toLowerCase());

    const derivedName =
      user.user_metadata?.name ||
      [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ") ||
      user.email?.split("@")[0] ||
      "User";

    const profileData = {
      id: user.id,
      first_name: user.user_metadata?.first_name || null,
      last_name: user.user_metadata?.last_name || null,
      phone_number: (user as any)?.user_metadata?.phone_number || (user as any)?.user_metadata?.phone || null,
      name: derivedName,
      email: user.email || "",
      status: "active",
      is_admin: isAdmin,
      profile_picture_url: user.user_metadata?.avatar_url || null,
    } as any;

    // Use retry logic for profile creation as well
    const result = await retryWithExponentialBackoff(async () => {
      return await supabase
        .from("profiles")
        .upsert([profileData], { onConflict: "id" })
        .select("id, first_name, last_name, name, email, status, profile_picture_url, bio, is_admin, created_at, preferred_delivery_locker_data")
        .single();
    });

    const { data: newProfile, error: createError } = result;

    if (createError) {
      logError("Error creating profile", createError);
      throw new Error(
        getErrorMessage(createError, "Failed to create user profile"),
      );
    }

    const createdDisplayName = buildDisplayName(newProfile);

    // Welcome notification: trigger add-subscriber + send welcome email (non-blocking)
    supabase.functions.invoke("add-subscriber", {
      body: {
        email: user.email || "",
        firstName: user.user_metadata?.first_name ||
          (user.user_metadata?.name || "").split(" ")[0] ||
          user.email?.split("@")[0] || "",
        lastName: user.user_metadata?.last_name ||
          (user.user_metadata?.name || "").split(" ").slice(1).join(" ") || "",
        sendWelcomeEmail: true,
      },
    }).catch(() => {}); // Non-fatal

    return {
      id: newProfile.id,
      name: createdDisplayName,
      email: newProfile.email,
      isAdmin: newProfile.is_admin || false,
      status: newProfile.status,
      profile_picture_url: newProfile.profile_picture_url,
      bio: newProfile.bio,
      created_at: newProfile.created_at,
      preferred_delivery_locker_data: newProfile.preferred_delivery_locker_data,
    };
  } catch (error) {
    logError("Error in createUserProfile", error);
    throw new Error(getErrorMessage(error, "Failed to create user profile"));
  }
};
