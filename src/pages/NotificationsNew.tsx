import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getSafeErrorMessage } from "@/utils/errorMessageUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Gift,
  Package,
  ShoppingCart,
  Star,
  Truck,
  Heart,
  Check,
  Settings,
  BookOpen,
  Users,
  TrendingUp,
  Award,
  MessageCircle,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { NotificationService, clearNotificationCache } from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
type ConnectionTestResult = { isOnline: boolean; supabaseReachable: boolean; authWorking: boolean; databaseWorking: boolean; latency?: number; error?: string };
const testConnection = async (): Promise<ConnectionTestResult> => ({ isOnline: navigator.onLine, supabaseReachable: true, authWorking: true, databaseWorking: true, latency: 0 });
const getConnectionErrorMessage = () => "Connection unavailable";

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  notifications: NotificationItem[];
  enabled: boolean;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "high" | "medium" | "low";
  actionUrl?: string;
  metadata?: Record<string, any>;
}

const NotificationsNew = () => {
  const { user, profile } = useAuth();
  const {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    refreshNotifications,
  } = useNotifications();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    commits: true,
    purchases: true,
    deliveries: true,
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionTestResult | null>(null);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [dismissingNotifications, setDismissingNotifications] = useState<Set<string>>(new Set());

  // Convert database notifications to our category format
  const categorizeNotifications = (dbNotifications: any[]) => {
    // Create arrays to track categorized notifications
    const categorizedIds = new Set();

    const commitNotifications = dbNotifications.filter((n) => {
      const isCommit = n.title?.toLowerCase().includes("commit") ||
        n.message?.toLowerCase().includes("commit") ||
        n.title?.includes("⏰") ||
        (n.type === "warning" && (n.title?.includes("Commit") || n.message?.includes("commit")));
      if (isCommit) categorizedIds.add(n.id);
      return isCommit;
    });

    const purchaseNotifications = dbNotifications.filter((n) => {
      if (categorizedIds.has(n.id)) return false;
      const isPurchase = n.title?.toLowerCase().includes("purchase") ||
        n.title?.toLowerCase().includes("order") ||
        n.title?.toLowerCase().includes("payment") ||
        n.title?.toLowerCase().includes("book listed") ||
        n.title?.toLowerCase().includes("listed successfully") ||
        n.title?.includes("🛒") ||
        n.title?.includes("📦") ||
        n.title?.includes("📚") ||
        n.title?.includes("💳") ||
        n.title?.includes("✅") ||
        n.title?.includes("🎉") ||
        (n.type === "success" && (n.title?.includes("Order") || n.title?.includes("Payment") || n.title?.includes("Listed")));
      if (isPurchase) categorizedIds.add(n.id);
      return isPurchase;
    });

    const deliveryNotifications = dbNotifications.filter((n) => {
      if (categorizedIds.has(n.id)) return false;
      const isDelivery = n.title?.toLowerCase().includes("delivery") ||
        n.title?.toLowerCase().includes("shipping") ||
        n.title?.toLowerCase().includes("tracking") ||
        n.title?.includes("🚚") ||
        (n.type === "info" && (n.title?.includes("Delivery") || n.title?.includes("Shipping")));
      if (isDelivery) categorizedIds.add(n.id);
      return isDelivery;
    });

    const adminNotifications = dbNotifications.filter((n) => {
      if (categorizedIds.has(n.id)) return false;
      const isAdmin = n.type === "admin_action" ||
        n.type === "admin" ||
        n.type === "broadcast" ||
        n.type === "system" ||
        n.title?.toLowerCase().includes("removed") ||
        n.title?.toLowerCase().includes("deleted") ||
        n.title?.toLowerCase().includes("banned") ||
        n.title?.toLowerCase().includes("suspended") ||
        n.title?.toLowerCase().includes("violation") ||
        n.title?.toLowerCase().includes("rebooked solutions team") ||
        n.title?.toLowerCase().includes("system announcement") ||
        n.title?.toLowerCase().includes("admin action") ||
        n.message?.toLowerCase().includes("admin") ||
        n.message?.toLowerCase().includes("violation") ||
        n.message?.toLowerCase().includes("removed by admin") ||
        n.message?.toLowerCase().includes("system message");
      if (isAdmin) categorizedIds.add(n.id);
      return isAdmin;
    });

    const accountNotifications = dbNotifications.filter((n) => {
      if (categorizedIds.has(n.id)) return false;
      const isAccount = n.title?.toLowerCase().includes("profile") ||
        n.title?.toLowerCase().includes("banking") ||
        n.title?.toLowerCase().includes("account") ||
        n.title?.toLowerCase().includes("activity") ||
        n.title?.toLowerCase().includes("updated") ||
        n.title?.toLowerCase().includes("settings") ||
        (n.type === "success" && (n.title?.includes("Profile") || n.title?.includes("Banking") || n.title?.includes("Activity")));
      if (isAccount) categorizedIds.add(n.id);
      return isAccount;
    });

    // General/Test notifications category - catch all remaining
    const generalNotifications = dbNotifications.filter((n) => {
      if (categorizedIds.has(n.id)) return false;
      return true; // All remaining notifications go here
    });

    return {
      commits: commitNotifications,
      purchases: purchaseNotifications,
      deliveries: deliveryNotifications,
      admin: adminNotifications,
      account: accountNotifications,
      general: generalNotifications,
    };
  };

  const categorizedNotifications = categorizeNotifications(notifications);

  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: "welcome-disabled",
      title: "Welcome to ReBooked Solutions!",
      description: "Get started with buying and selling textbooks",
      icon: <Gift className="h-5 w-5" />,
      color: "purple",
      enabled: false,
      notifications: [
        {
          id: "welcome-1",
          type: "welcome",
          title: "Welcome to ReBooked Solutions! 🎉",
          message:
            "We're South Africa's premier textbook marketplace, connecting students across universities. Buy and sell textbooks easily, track your orders, and join a community of learners!",
          timestamp: new Date().toISOString(),
          read: false,
          priority: "high",
        },
        {
          id: "welcome-2",
          type: "info",
          title: "How ReBooked Solutions Works",
          message:
            "📚 Browse thousands of textbooks → 💰 Buy at student-friendly prices → 🚚 Get delivery nationwide → ✅ Sell your old books when done!",
          timestamp: new Date().toISOString(),
          read: false,
          priority: "medium",
        },
        {
          id: "welcome-3",
          type: "tip",
          title: "Quick Start Guide",
          message:
            "🔹 Complete your profile setup\\n��� Add your addresses for delivery\\n🔹 Set up banking for selling\\n🔹 Start browsing or list your first book!",
          timestamp: new Date().toISOString(),
          read: false,
          priority: "medium",
        },
      ],
    },
    {
      id: "commits",
      title: "Sale Commitments",
      description: "48-hour commitment system for sellers",
      icon: <Award className="h-5 w-5" />,
      color: "orange",
      enabled: notificationSettings.commits,
      notifications: categorizedNotifications.commits.map((n) => ({
        id: n.id,
        type: n.type || "commit",
        title: n.title,
        message: n.message,
        timestamp: n.created_at || n.createdAt,
        read: n.read,
        priority: "medium" as const,
      })),
    },
    {
      id: "purchases",
      title: "Purchase Updates",
      description: "Order confirmations and payment updates",
      icon: <ShoppingCart className="h-5 w-5" />,
      color: "green",
      enabled: notificationSettings.purchases,
      notifications: categorizedNotifications.purchases.map((n) => ({
        id: n.id,
        type: n.type || "purchase",
        title: n.title,
        message: n.message,
        timestamp: n.created_at || n.createdAt,
        read: n.read,
        priority: "medium" as const,
      })),
    },
    {
      id: "deliveries",
      title: "Delivery Tracking",
      description: "Shipping updates and delivery notifications",
      icon: <Truck className="h-5 w-5" />,
      color: "blue",
      enabled: notificationSettings.deliveries,
      notifications: categorizedNotifications.deliveries.map((n) => ({
        id: n.id,
        type: n.type || "delivery",
        title: n.title,
        message: n.message,
        timestamp: n.created_at || n.createdAt,
        read: n.read,
        priority: "medium" as const,
      })),
    },
    {
      id: "admin",
      title: "System Messages & Admin Actions",
      description: "Official communications and administrative actions",
      icon: <Settings className="h-5 w-5" />,
      color: "red",
      enabled: true,
      notifications: categorizedNotifications.admin.map((n) => ({
        id: n.id,
        type: n.type || "admin",
        title: n.title,
        message: n.message,
        timestamp: n.created_at || n.createdAt,
        read: n.read,
        priority: "high" as const,
      })),
    },
    {
      id: "account",
      title: "Account & Profile Updates",
      description: "Profile changes, banking updates, and account activities",
      icon: <Users className="h-5 w-5" />,
      color: "purple",
      enabled: true,
      notifications: categorizedNotifications.account.map((n) => ({
        id: n.id,
        type: n.type || "account",
        title: n.title,
        message: n.message,
        timestamp: n.created_at || n.createdAt,
        read: n.read,
        priority: "medium" as const,
      })),
    },
    {
      id: "general",
      title: "General Notifications",
      description: "Other general updates",
      icon: <Bell className="h-5 w-5" />,
      color: "gray",
      enabled: true,
      notifications: categorizedNotifications.general.map((n) => ({
        id: n.id,
        type: n.type || "general",
        title: n.title,
        message: n.message,
        timestamp: n.created_at || n.createdAt,
        read: n.read,
        priority: "low" as const,
      })),
    },
  ]);

  // Test connection on component mount
  useEffect(() => {

    const checkConnection = async () => {
      try {
        const result = await testConnection();
        setConnectionStatus(result);

        if (!result.supabaseReachable || !result.databaseWorking) {
          toast.warning('Connection issues detected. Some features may not work properly.');
        }
      } catch (error) {
        const safeConnectionErrorMessage = getSafeErrorMessage(error, 'Connection test failed');
        const errorMessage = getConnectionErrorMessage();
        setConnectionStatus({
          isOnline: navigator.onLine,
          supabaseReachable: false,
          authWorking: false,
          databaseWorking: false,
          error: errorMessage
        });
      }
    };

    checkConnection();
  }, []);

  // Disable welcome notification entirely
  useEffect(() => {
    setIsFirstTime(false);
    setShowWelcome(false);
    setCategories((prev) => prev.filter((c) => c.id !== "welcome" && c.id !== "welcome-disabled"));
  }, [user, profile]);

  // Update categories when notifications change
  useEffect(() => {
    const categorizedNotifications = categorizeNotifications(notifications);

    setCategories((prev) =>
      prev.map((category) => {
        if (category.id === "commits") {
          return {
            ...category,
            notifications: categorizedNotifications.commits.map((n) => ({
              id: n.id,
              type: n.type || "commit",
              title: n.title,
              message: n.message,
              timestamp: n.created_at || n.createdAt,
              read: n.read,
              priority: "medium" as const,
            })),
          };
        }
        if (category.id === "purchases") {
          return {
            ...category,
            notifications: categorizedNotifications.purchases.map((n) => ({
              id: n.id,
              type: n.type || "purchase",
              title: n.title,
              message: n.message,
              timestamp: n.created_at || n.createdAt,
              read: n.read,
              priority: "medium" as const,
            })),
          };
        }
        if (category.id === "deliveries") {
          return {
            ...category,
            notifications: categorizedNotifications.deliveries.map((n) => ({
              id: n.id,
              type: n.type || "delivery",
              title: n.title,
              message: n.message,
              timestamp: n.created_at || n.createdAt,
              read: n.read,
              priority: "medium" as const,
            })),
          };
        }
        if (category.id === "admin") {
          return {
            ...category,
            notifications: categorizedNotifications.admin.map((n) => ({
              id: n.id,
              type: n.type || "admin",
              title: n.title,
              message: n.message,
              timestamp: n.created_at || n.createdAt,
              read: n.read,
              priority: "high" as const,
            })),
          };
        }
        if (category.id === "account") {
          return {
            ...category,
            notifications: categorizedNotifications.account.map((n) => ({
              id: n.id,
              type: n.type || "account",
              title: n.title,
              message: n.message,
              timestamp: n.created_at || n.createdAt,
              read: n.read,
              priority: "medium" as const,
            })),
          };
        }
        if (category.id === "general") {
          return {
            ...category,
            notifications: categorizedNotifications.general.map((n) => ({
              id: n.id,
              type: n.type || "general",
              title: n.title,
              message: n.message,
              timestamp: n.created_at || n.createdAt,
              read: n.read,
              priority: "low" as const,
            })),
          };
        }

        return category;
      }),
    );
  }, [notifications]);

  const markWelcomeAsSeen = () => {
    if (user) {
      // Set multiple localStorage keys to ensure it's permanently dismissed
      localStorage.setItem(`welcome_seen_${user.id}`, "true");
      localStorage.setItem(
        `welcome_dismissed_${user.id}`,
        new Date().toISOString(),
      );

      // Update all state to ensure it's hidden immediately and permanently
      setShowWelcome(false);
      setIsFirstTime(false);

      // Remove welcome notifications from categories
      setCategories((prev) =>
        prev.filter((category) => category.id !== "welcome"),
      );

      toast.success(
        "Welcome! You're all set to start using ReBooked Solutions.",
      );
    }
  };

  const getNotificationIcon = (type: string, title?: string, message?: string) => {
    // Content-based icon detection (more specific)
    if (title?.includes("🧪") || title?.includes("Test")) {
      return <Bell className="h-4 w-4 text-gray-500" />;
    }
    if (title?.includes("⏰") || title?.includes("Commit") || message?.includes("commit")) {
      return <Award className="h-4 w-4 text-orange-500" />;
    }
    if (title?.includes("🛒") || title?.includes("📦") || title?.includes("💳") || title?.includes("Order") || title?.includes("Purchase") || title?.includes("Payment")) {
      return <ShoppingCart className="h-4 w-4 text-green-500" />;
    }
    if (title?.includes("📦") || title?.includes("Delivery") || title?.includes("Shipping")) {
      return <Truck className="h-4 w-4 text-blue-500" />;
    }

    // Fallback to type-based icons
    switch (type) {
      case "welcome":
        return <Gift className="h-4 w-4 text-purple-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "info":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const markAsRead = (categoryId: string, notificationId: string) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              notifications: category.notifications.map((notif) =>
                notif.id === notificationId ? { ...notif, read: true } : notif,
              ),
            }
          : category,
      ),
    );
  };

  const dismissNotification = async (categoryId: string, notificationId: string) => {
    // Set dismissing state
    setDismissingNotifications(prev => new Set(prev).add(notificationId));

    try {

      // Check network connectivity first
      if (!navigator.onLine) {
        toast.error('No internet connection. Please check your network.');
        return;
      }

      // Check if user is authenticated
      if (!user?.id) {
        toast.error('You must be logged in to delete notifications');
        return;
      }

      // First, let's verify the notification exists - check both tables

      let existingNotification = null;
      let notificationTable = 'notifications';
      let checkError = null;

      // Try notifications table first
      const { data: regularNotif, error: regularError } = await supabase
        .from('notifications')
        .select('id, user_id, title')
        .eq('id', notificationId)
        .single();

      if (!regularError && regularNotif) {
        existingNotification = regularNotif;
        notificationTable = 'notifications';
      } else if (regularError?.code !== 'PGRST116') {
        // Only treat as error if it's not "not found"
        checkError = regularError;
      } else {
        // Not found in notifications, try order_notifications
        const { data: orderNotif, error: orderError } = await supabase
          .from('order_notifications')
          .select('id, user_id, title')
          .eq('id', notificationId)
          .single();

        if (!orderError && orderNotif) {
          existingNotification = orderNotif;
          notificationTable = 'order_notifications';
        } else if (orderError?.code !== 'PGRST116') {
          checkError = orderError;
        }
      }

      if (checkError) {
        const safeErrorMessage = getSafeErrorMessage(checkError, 'Unknown error checking notification');
        toast.error(`Notification not found: ${safeErrorMessage}`);
        return;
      }

      if (!existingNotification) {
        toast.error('Notification not found');
        return;
      }

      // Verify ownership
      if (existingNotification.user_id !== user.id) {
        toast.error('You can only delete your own notifications');
        return;
      }

      // Delete from the correct table
      const { data: deleteData, error: deleteError } = await supabase
        .from(notificationTable)
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id); // Double-check ownership in delete query

      if (deleteError) {
        const safeDeleteErrorMessage = getSafeErrorMessage(deleteError, 'Unknown delete error');

        // Handle specific error cases with user-friendly messages
        if (deleteError.code === 'PGRST116') {
          toast.error('Notification not found. Please try again.');
        } else if (deleteError.code === '42501') {
          toast.error('Unable to remove notification. Please try again or contact support.');
        } else if (safeDeleteErrorMessage?.includes('Failed to fetch') || safeDeleteErrorMessage?.includes('network')) {
          toast.error('Network connection issue. Please check your internet and try again.');
        } else {
          toast.error('Unable to remove notification. Please try again or contact support.');
        }
        return;
      }

      // Clear notification cache to avoid stale reads
      if (user?.id) {
        clearNotificationCache(user.id);
      }

      // Update local state to remove from UI immediately (before showing success message)
      setCategories((prev) => {
        const updatedCategories = prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                notifications: category.notifications.filter(
                  (notif) => notif.id !== notificationId,
                ),
              }
            : category,
        );
        return updatedCategories;
      });

      // Show success message immediately after UI update
      toast.success('Notification removed');

      // Immediately refresh the notifications hook to update badge count and ensure consistency
      try {
        await refreshNotifications();
      } catch (refreshError) {
        const safeRefreshErrorMessage = getSafeErrorMessage(refreshError, 'Failed to refresh notifications');
        // Show warning but don't fail the operation since local state was updated
        toast.warning('Notification removed. Please refresh if the count seems off.');
      }

    } catch (error) {
      // Show user-friendly error message
      const safeCatchErrorMessage = getSafeErrorMessage(error, 'An unexpected error occurred');

      if (error instanceof TypeError && safeCatchErrorMessage.includes('Failed to fetch')) {
        toast.error('Network connection issue. Please check your internet and try again.');
      } else {
        toast.error('Unable to remove notification. Please try again or contact support.');
      }
    } finally {
      // Clear dismissing state
      setDismissingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  // Flat, sorted list of all notifications
  const allNotifications = notifications
    .slice()
    .sort((a: any, b: any) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());


  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="p-3 bg-book-50 rounded-full">
            <Bell className="h-8 w-8 text-book-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Stay updated with your ReBooked Solutions activity
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-book-600 text-white hover:bg-book-700">
              {unreadCount} new
            </Badge>
          )}
        </div>

        {/* Empty state */}
        {!isLoading && allNotifications.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-base font-medium text-gray-500">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">You're all caught up — we'll let you know when something happens.</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-20 text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-book-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm mt-3">Loading notifications...</p>
          </div>
        )}

        {/* Flat Notification List */}
        {!isLoading && allNotifications.length > 0 && (
          <div className="space-y-2">
            {allNotifications.map((notif: any) => {
              const id = notif.id;
              const isRead = notif.read;
              const isDismissing = dismissingNotifications.has(id);
              return (
                <div
                  key={id}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                    isRead
                      ? "bg-white border-gray-100"
                      : "bg-white border-gray-200 shadow-sm"
                  }`}
                >
                  {/* Unread dot */}
                  {!isRead && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-book-600 flex-shrink-0" />
                  )}
                  {isRead && <span className="mt-1.5 w-2 h-2 flex-shrink-0" />}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      {notif.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(notif.created_at || notif.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isRead && (
                      <button
                        onClick={() => markAsRead("all", id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-book-600 hover:bg-book-50 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => dismissNotification("all", id)}
                      disabled={isDismissing}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Dismiss"
                    >
                      {isDismissing ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsNew;
