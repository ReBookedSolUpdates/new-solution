import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ActivityService } from "@/services/activityService";
import { DeviceMetadataUtils } from "@/utils/deviceMetadataUtils";
import debugLogger from "@/utils/debugLogger";

/**
 * Hook to track page views and time spent on pages
 * Should be used at the top level of your app (e.g., in the main App component)
 */
export const usePageTracking = (userId?: string) => {
  const location = useLocation();
  const pageStartTimeRef = useRef<number>(Date.now());
  const previousPathRef = useRef<string>(location.pathname);

  // Track page view on route change
  useEffect(() => {
    const currentPath = location.pathname;

    // Only track if path actually changed
    if (previousPathRef.current !== currentPath) {
      // Track time spent on previous page
      const timeSpentMs = Date.now() - pageStartTimeRef.current;
      
      if (previousPathRef.current && timeSpentMs > 0) {
        trackPreviousPageTimeSpent(
          previousPathRef.current,
          timeSpentMs,
          userId
        );
      }

      // Track new page view
      trackNewPageView(currentPath, userId);

      // Reset for new page
      pageStartTimeRef.current = Date.now();
      previousPathRef.current = currentPath;
    }
  }, [location.pathname, userId]);

  // Track page view on component unmount (e.g., app close or tab close)
  useEffect(() => {
    return () => {
      const timeSpentMs = Date.now() - pageStartTimeRef.current;
      if (timeSpentMs > 0 && previousPathRef.current) {
        trackPreviousPageTimeSpent(
          previousPathRef.current,
          timeSpentMs,
          userId
        );
      }
    };
  }, [userId]);
};

/**
 * Track time spent on previous page
 */
async function trackPreviousPageTimeSpent(
  path: string,
  timeSpentMs: number,
  userId?: string
): Promise<void> {
  try {
    // Guard: if a userId was passed in but no live session exists (e.g. logging out),
    // skip the call so we don't hit RLS-blocked inserts.
    if (userId) {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      if (!data?.session) return;
    }
    await ActivityService.trackPageView(userId, path, {
      time_spent_ms: timeSpentMs,
      source: "page_navigation",
    });
  } catch (error) {
    debugLogger.error("usePageTracking", "Error tracking page time spent:", error);
  }
}

/**
 * Track new page view
 */
async function trackNewPageView(
  path: string,
  userId?: string
): Promise<void> {
  try {
    const deviceMetadata = DeviceMetadataUtils.getDeviceMetadata();

    await ActivityService.trackPageView(userId, path, {
      referrer: document.referrer || null,
      ...deviceMetadata,
    });
  } catch (error) {
    debugLogger.error("usePageTracking", "Error tracking page view:", error);
  }
}
