import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withRetry, handleSupabaseError, extractErrorMessage } from "@/utils/networkErrorHandler";

export interface CommitData {
  bookId: string;
  sellerId: string;
  buyerId: string;
  saleAmount: number;
  commitDeadline: string;
}

/**
 * Helper function to properly log errors with meaningful information
 */
const logCommitError = (
  message: string,
  error: unknown,
  context?: Record<string, any>,
) => {
  try {
    let errorInfo: any = {
      timestamp: new Date().toISOString(),
      context: context || {},
    };

    if (error instanceof Error) {
      errorInfo.type = "Error";
      errorInfo.message = error.message;
      errorInfo.stack = error.stack;
    } else if (error && typeof error === "object") {
      errorInfo.type = "Object";
      errorInfo.message = (error as any).message || "No message";
      errorInfo.code = (error as any).code || "unknown";
      errorInfo.details =
        (error as any).details || (error as any).hint || "No details";

      // Try to stringify the whole error object for debugging
      try {
        errorInfo.fullError = JSON.stringify(error, null, 2);
      } catch (stringifyError) {
        errorInfo.fullError = "Could not stringify error object";
        errorInfo.errorKeys = Object.keys(error);
      }
    } else {
      errorInfo.type = typeof error;
      errorInfo.message = String(error);
    }
  } catch (loggingError) {
    // Fallback if our error logging itself fails
  }
};

/**
 * Commits a book sale within the 48-hour window
 * Updates the book status and triggers delivery process
 */
export const commitBookSale = async (bookId: string): Promise<void> => {
  try {
    // Validate input
    if (!bookId || typeof bookId !== "string") {
      throw new Error("Invalid book ID provided");
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      if (userError) {
        logCommitError("Authentication error", userError);
      }
      throw new Error("User not authenticated");
    }

    // First, check if the book exists and is in the correct state
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("seller_id", user.id)
      .single();

    if (bookError) {
      logCommitError("Error fetching book", bookError, {
        bookId,
        userId: user.id,
      });
      throw new Error(
        `Failed to fetch book details: ${bookError.message || "Database error"}`,
      );
    }

    if (!book) {
      throw new Error(
        "Book not found or you don't have permission to commit this sale",
      );
    }

    // Check if book is already sold
    if (book.sold) {
      // In a real system, we'd check if commit is already processed
    }

    // Update book to mark as sold (simplified for current schema)
    const { error: updateError } = await supabase
      .from("books")
      .update({
        sold: true,
      })
      .eq("id", bookId)
      .eq("seller_id", user.id);

    if (updateError) {
      logCommitError("Error updating book status", updateError, {
        bookId,
        userId: user.id,
      });
      throw new Error(
        `Failed to commit sale: ${updateError.message || "Database update failed"}`,
      );
    }

    // TODO: Trigger delivery process initiation
    // This would typically involve:
    // 1. Notifying the buyer
    // 2. Creating shipping labels
    // 3. Starting the delivery tracking process
  } catch (error) {
    logCommitError("Error committing book sale", error);
    throw error;
  }
};

/**
 * Checks if a book sale commit is overdue (past 48 hours)
 */
export const checkCommitDeadline = (orderCreatedAt: string): boolean => {
  const orderDate = new Date(orderCreatedAt);
  const now = new Date();
  const diffInHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);

  return diffInHours > 48;
};

/**
 * Gets orders that require commit action from the seller
 * Returns orders with real expiry times based on creation date + 48 hours
 */
export const getCommitPendingBooks = async (): Promise<any[]> => {
  try {
    // Use retry logic for getting user with better error handling
    let user;
    try {
      const userResult = await withRetry(async () => {
        const result = await supabase.auth.getUser();
        if (result.error) {
          throw result.error;
        }
        return result;
      }, { maxRetries: 2, retryDelay: 1000 });

      user = userResult.data.user;
    } catch (userError) {
      const errorMessage = extractErrorMessage(userError);
      handleSupabaseError(userError, "Getting user for commit pending books");
      return [];
    }

    if (!user) {
      return [];
    }

    // Safety net: trigger server-side expiry check (non-blocking)
    try {
      supabase.functions.invoke('check-expired-orders', { body: {} }).catch(() => {});
    } catch {}

    // Query orders with pending_commit status - this is the real commit system
    let orders;
    try {
      const ordersResult = await withRetry(async () => {
        const result = await supabase
          .from("orders")
          .select(`
            id,
            amount,
            created_at,
            status,
            payment_status,
            buyer_email,
            items,
            delivery_option,
            order_type,
            book_id,
            item_id,
            item_type
          `)
          .eq("seller_id", user.id)
          .or('and(status.eq.pending_commit),and(payment_status.eq.paid,status.in.(pending_payment,pending,pending_commit))')
          .order("created_at", { ascending: true });

        if (result.error) {
          throw result.error;
        }
        return result;
      }, { maxRetries: 2, retryDelay: 1500 });

      orders = ordersResult.data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      handleSupabaseError(error, "Fetching pending orders");
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }

    // Transform orders to the expected format with real expiry times and enhanced data
    const pendingCommits = await Promise.all((orders || []).map(async (order) => {
      // Calculate real expiry time: created_at + 48 hours
      const orderCreated = new Date(order.created_at);
      const expiresAt = new Date(orderCreated.getTime() + 48 * 60 * 60 * 1000);

      // Extract book info from items JSON
      const items = Array.isArray(order.items) ? order.items : [];
      const firstItem = items[0] || {};
      const itemId = order.book_id || order.item_id || firstItem.book_id || firstItem.item_id;
      const itemType = order.item_type || firstItem.item_type || "book";

      // Try to get complete book data from books table
      let bookData = null;
      if (itemId) {
        try {
          const table = itemType === "uniform" ? "uniforms" : itemType === "school_supply" ? "school_supplies" : "books";
          const cols = table === "books"
            ? "id, title, author, price, image_url, front_cover, condition, grade, subject, school_name, size, colour, gender, province, isbn, description, category"
            : "id, title, price, image_url, condition, description, category";
          const { data } = await supabase
            .from(table)
            .select(cols)
            .eq("id", itemId)
            .single();
          bookData = data;
        } catch (error) {
          // If query fails, try fallback tables
          const tables = ["books", "uniforms", "school_supplies"];
          for (const tbl of tables) {
            try {
              const cols = tbl === "books"
                ? "id, title, author, price, image_url, front_cover, condition, grade, subject, school_name, size, colour, gender, province, isbn, description, category"
                : "id, title, price, image_url, condition, description, category";
              const { data } = await supabase.from(tbl).select(cols).eq("id", itemId).single();
              if (data) {
                bookData = data;
                break;
              }
            } catch {}
          }
        }
      }

      // Calculate earnings (assuming 5% platform fee)
      const totalAmount = order.amount / 100; // Convert from kobo to rands
      const platformFee = totalAmount * 0.05; // 5% platform fee
      const earnings = totalAmount - platformFee;

      return {
        id: order.id,
        bookId: itemId || "unknown",
        title: bookData?.title || firstItem.name || "Order Item",
        expiresAt: expiresAt.toISOString(), // This now uses the real expiry time!
        bookTitle: bookData?.title || firstItem.name || "Order Item",
        buyerName: order.buyer_email?.split("@")[0] || "Unknown Buyer",
        price: totalAmount,
        earnings: earnings, // Add earnings calculation
        platformFee: platformFee, // Add platform fee info
        createdAt: order.created_at,
        status: "pending",
        author: (bookData as any)?.author || firstItem.author || (itemType === "uniform" ? "School Uniform" : itemType === "school_supply" ? "School Supply" : "Unknown Author"),
        buyerEmail: order.buyer_email,
        sellerName: "Current User",
        imageUrl: (bookData as any)?.front_cover || (bookData as any)?.image_url || firstItem.front_cover || firstItem.image_url || (Array.isArray(order.items) && order.items[0]?.front_cover) || (Array.isArray(order.items) && order.items[0]?.image_url) || null,
        deliveryMethod: order.delivery_option,
        orderType: order.order_type,
        condition: bookData?.condition || "Good",
        grade: (bookData as any)?.grade,
        subject: (bookData as any)?.subject,
        schoolName: (bookData as any)?.school_name,
        size: (bookData as any)?.size,
        colour: (bookData as any)?.colour,
        gender: (bookData as any)?.gender,
        province: (bookData as any)?.province,
        isbn: (bookData as any)?.isbn,
        description: bookData?.description,
        category: bookData?.category,
      };
    }));

    return pendingCommits;
  } catch (error) {
    logCommitError("Exception in getCommitPendingBooks", error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

/**
 * Declines an order within the 48-hour window
 * Calls the decline-commit edge function which handles:
 * - Order status update to "declined"
 * - Automatic stock release via database trigger
 * - Refund processing
 * - Email notifications
 *
 * IMPORTANT: The frontend should NOT manually restore stock.
 * The database trigger handle_order_decline_stock_release automatically
 * handles stock release when order status changes to 'declined'.
 */
export const declineBookSale = async (orderIdOrBookId: string): Promise<void> => {
  try {
    // Validate input
    if (!orderIdOrBookId || typeof orderIdOrBookId !== "string") {
      throw new Error("Invalid order/book ID provided");
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      if (userError) {
      }
      throw new Error("User not authenticated");
    }

    // Try to find the order first (since we're now passing order IDs)
    let order = null;

    // First, try to get the order (check both pending_commit and pending statuses)
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, seller_id, status")
      .eq("id", orderIdOrBookId)
      .eq("seller_id", user.id)
      .in("status", ["pending_commit", "pending"])
      .single();

    if (!orderError && orderData) {
      order = orderData;
    } else {
      throw new Error("Order not found or not in pending status");
    }

    // Call the decline-commit edge function to handle the decline process
    // This function will:
    // 1. Update order status to "declined"
    // 2. Trigger database trigger to automatically release stock
    // 3. Process refund
    // 4. Send notifications
    const { data, error } = await supabase.functions.invoke("decline-commit", {
      body: {
        order_id: order.id,
        seller_id: user.id,
        reason: "Declined by seller"
      }
    });

    if (error) {
      throw new Error(error.message || "Failed to call decline-commit function");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Failed to decline order");
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Processes refund for a cancelled or declined sale
 */
export const processRefund = async (
  bookId: string,
  reason: "declined_by_seller" | "overdue_commit",
): Promise<void> => {
  try {
    // In a real system, this would:
    // 1. Call payment processor (Paystack) to issue refund
    // 2. Update order status to "refunded"
    // 3. Send notification emails to buyer and seller
    // 4. Update seller reputation metrics
    // 5. Log the refund activity

    // For now, we'll process the refund action
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return;
    }

    // In production, you would:
    // 1. Call Paystack refund API
    // 2. Send email notifications
    // 3. Update database records
    // 4. Log to activity service
  } catch (error) {
    logCommitError("Error processing refund", error, { bookId, reason });
    // Don't throw error to prevent blocking other operations
  }
};

/**
 * Handles automatic cancellation of overdue commits
 */
export const handleOverdueCommits = async (): Promise<void> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return; // Silent fail for background process
    }

    const pendingBooks = await getCommitPendingBooks();

    for (const book of pendingBooks) {
      if (book.createdAt && checkCommitDeadline(book.createdAt)) {
        // Cancel the order and make book available again
        const { error: cancelError } = await supabase
          .from("books")
          .update({
            sold: false,
          })
          .eq("id", book.bookId);

        if (!cancelError) {
          // Trigger refund process for overdue commitment
          await processRefund(book.bookId, "overdue_commit");
        }
      }
    }
  } catch (error) {
    logCommitError("Error handling overdue commits", error);
    // Don't throw error for background process
  }
};

/**
 * Monitors and enforces the 48-hour commit deadline
 * This should be called periodically (e.g., via cron job or interval)
 */
export const enforceCommitDeadlines = async (): Promise<{
  processed: number;
  refunded: number;
  errors: number;
}> => {
  let processed = 0;
  let refunded = 0;
  let errors = 0;

  try {
    // This would typically query a proper orders table with buyer/seller relationships
    // For now, we'll use the current simplified structure

    const { data: overdueBooks, error } = await supabase
      .from("books")
      .select("*")
      .eq("sold", true)
      .lt(
        "created_at",
        new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      );

    if (error) {
      return { processed: 0, refunded: 0, errors: 1 };
    }

    for (const book of overdueBooks || []) {
      try {
        processed++;

        // Check if this book is actually overdue (48+ hours since order)
        if (checkCommitDeadline(book.created_at)) {
          // Make book available again
          const { error: updateError } = await supabase
            .from("books")
            .update({ sold: false })
            .eq("id", book.id);

          if (updateError) {
            errors++;
            continue;
          }

          // Process refund
          await processRefund(book.id, "overdue_commit");
          refunded++;
        }
      } catch (bookError) {
        errors++;
      }
    }

    return { processed, refunded, errors };
  } catch (error) {
    logCommitError("Error in enforceCommitDeadlines", error);
    return { processed, refunded, errors: errors + 1 };
  }
};

// Export for use in background jobs or API endpoints
export const COMMIT_DEADLINE_HOURS = 48;
