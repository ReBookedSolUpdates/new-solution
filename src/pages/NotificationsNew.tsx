import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Bell, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { clearNotificationCache, markNotificationAsRead } from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";

const NotificationsNew = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, refreshNotifications } = useNotifications();
  const [displayNotifications, setDisplayNotifications] = useState<any[]>([]);

  useEffect(() => {
    setDisplayNotifications(
      notifications
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at || b.createdAt || 0).getTime() -
            new Date(a.created_at || a.createdAt || 0).getTime(),
        ),
    );
  }, [notifications]);

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

  const markAsReadOptimistic = async (notificationId: string) => {
    if (!user?.id) return;

    const previous = displayNotifications;
    setDisplayNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification,
      ),
    );

    try {
      const success = await markNotificationAsRead(notificationId);
      if (!success) {
        setDisplayNotifications(previous);
        toast.error("Unable to mark notification as read");
        return;
      }
      clearNotificationCache(user.id);
      refreshNotifications().catch(() => {});
    } catch {
      setDisplayNotifications(previous);
      toast.error("Unable to mark notification as read");
    }
  };

  const dismissNotificationOptimistic = async (notification: any) => {
    if (!user?.id) {
      toast.error("You must be logged in to remove notifications");
      return;
    }

    const previous = displayNotifications;
    setDisplayNotifications((prev) =>
      prev.filter((entry) => entry.id !== notification.id),
    );

    try {
      const regularDelete = await supabase
        .from("notifications")
        .delete()
        .eq("id", notification.id)
        .eq("user_id", user.id)
        .select("id");

      const deletedFromRegular = (regularDelete.data || []).length > 0;

      if (!deletedFromRegular) {
        const orderDelete = await supabase
          .from("order_notifications")
          .delete()
          .eq("id", notification.id)
          .eq("user_id", user.id)
          .select("id");

        const deletedFromOrder = (orderDelete.data || []).length > 0;

        if (orderDelete.error || !deletedFromOrder) {
          throw orderDelete.error || regularDelete.error || new Error("Notification not found");
        }
      }

      clearNotificationCache(user.id);
      refreshNotifications().catch(() => {});
    } catch {
      setDisplayNotifications(previous);
      toast.error("Unable to remove notification");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-center sm:text-left">
          <div className="rounded-full bg-book-50 p-3">
            <Bell className="h-8 w-8 text-book-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Order updates, account activity, delivery progress, and platform notices.
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-book-600 text-white hover:bg-book-700">
              {unreadCount} new
            </Badge>
          )}
        </div>

        {!isLoading && displayNotifications.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            <Bell className="mx-auto mb-4 h-12 w-12 opacity-30" />
            <p className="text-base font-medium text-gray-500">No notifications yet</p>
            <p className="mt-1 text-sm text-gray-400">
              You&apos;re all caught up. We&apos;ll let you know when something happens.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="py-20 text-center text-gray-400">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-book-600" />
            <p className="mt-3 text-sm">Loading notifications...</p>
          </div>
        )}

        {!isLoading && displayNotifications.length > 0 && (
          <div className="space-y-3">
            {displayNotifications.map((notification: any) => {
              const isRead = notification.read;
              return (
                <article
                  key={notification.id}
                  className={`relative rounded-2xl border p-4 pr-24 transition-all ${
                    isRead
                      ? "border-stone-200 bg-white"
                      : "border-book-200 bg-white shadow-sm"
                  }`}
                >
                  <div className="absolute right-3 top-3 flex items-center gap-1">
                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => markAsReadOptimistic(notification.id)}
                        className="rounded-full border border-book-100 bg-book-50 p-2 text-book-700 transition-colors hover:bg-book-100"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => dismissNotificationOptimistic(notification)}
                      className="rounded-full border border-red-100 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                      title="Remove notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        isRead ? "bg-stone-200" : "bg-book-600"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-gray-900">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        {formatTimestamp(notification.created_at || notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsNew;
