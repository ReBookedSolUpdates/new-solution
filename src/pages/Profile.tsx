import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  BookOpen,
  Settings,
  MapPin,
  CreditCard,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Mail,
  Calendar,
  Package,
  TrendingUp,
  Share2,
  Eye,
  Phone,
  Clock,
  ShoppingBag,
  X,
  CheckCircle,
  Loader2,
  MessageSquare,
} from "lucide-react";
import ChatList from "@/components/chat/ChatList";
import ChatView from "@/components/chat/ChatView";
import { Conversation } from "@/services/chatService";
import { getUserBooks } from "@/services/book/bookQueries";
import { deleteBook } from "@/services/book/bookMutations";
import { saveUserAddresses, getUserAddresses, updateBooksPickupAddress } from "@/services/addressService";
import { Book } from "@/types/book";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ModernAddressTab from "@/components/profile/ModernAddressTab";
import OrderManagementView from "@/components/orders/OrderManagementView";
import { useCommit } from "@/hooks/useCommit";
import EnhancedOrderCommitButton from "@/components/orders/EnhancedOrderCommitButton";
import BankingProfileTab from "@/components/profile/BankingProfileTab";
import ShareProfileDialog from "@/components/ShareProfileDialog";
import ProfileEditDialog from "@/components/ProfileEditDialog";
// Transparency moved to standalone page
import { UserProfile, AddressData, Address } from "@/types/address";
import { handleAddressError, getUserFriendlyErrorMessage } from "@/utils/errorDisplayUtils";

// ─── ActivityCommits: must live OUTSIDE Profile to avoid remount glitching ───
const ActivityCommits: React.FC = () => {
  const { user } = useAuth();
  const { pendingCommits, refreshPendingCommits, declineBook, isCommitting, isDeclining } = useCommit();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    refreshPendingCommits().catch(() => {});
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, [refreshPendingCommits]);

  if (!pendingCommits || pendingCommits.length === 0) return (
    <Alert className="border-book-200 bg-book-50">
      <AlertDescription className="text-book-700">No pending commits.</AlertDescription>
    </Alert>
  );
  return (
    <div className="space-y-4">
      {pendingCommits.map((c: any) => {
        const ms = Math.max(0, new Date(c.expiresAt).getTime() - now.getTime());
        const mins = Math.floor(ms / 60000);
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        const urgent = hrs < 12;
        return (
          <Card key={c.id} className="border border-book-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
            <div className={`h-1.5 ${urgent ? "bg-red-500" : "bg-book-600"}`} />
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="flex-shrink-0">
                  <div className="w-20 h-28 bg-gradient-to-br from-book-100 to-book-200 rounded-lg overflow-hidden shadow-md border border-book-300">
                    <img src={c.imageUrl || "/placeholder.svg"} onError={(e: any) => (e.currentTarget.src = "/placeholder.svg")} className="w-full h-full object-cover" alt={c.bookTitle} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-book-900 line-clamp-2 mb-1">{c.bookTitle}</h3>
                      {c.author && <p className="text-sm text-book-600">by {c.author}</p>}
                    </div>
                    {urgent && (
                      <Badge className="flex-shrink-0 bg-red-100 text-red-700 border border-red-300 font-semibold">
                        URGENT
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 pb-4 border-b border-book-200">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-book-500 uppercase tracking-wide">Buyer</span>
                      <span className="text-sm font-medium text-book-900 mt-0.5">{c.buyerName}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-book-500 uppercase tracking-wide">Sale Price</span>
                      <span className="text-sm font-bold text-book-900 mt-0.5">R{c.price?.toFixed?.(2) || c.price}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-book-500 uppercase tracking-wide">Order ID</span>
                      <span className="text-sm font-mono text-book-700 mt-0.5">{c.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-book-500 uppercase tracking-wide">Time Left</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className={`h-3.5 w-3.5 ${urgent ? "text-red-500" : "text-book-600"}`} />
                        <span className={`text-sm font-semibold ${urgent ? "text-red-600" : "text-book-600"}`}>
                          {mins <= 0 ? "Expired" : (hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-book-600 mb-4 p-2 bg-book-50 rounded">
                    <CheckCircle className="h-3.5 w-3.5 text-book-400" />
                    <span>Waiting for your confirmation to arrange courier pickup</span>
                  </div>
                </div>
                <div className="flex gap-2 md:flex-col md:justify-start flex-shrink-0 md:w-auto">
                  <EnhancedOrderCommitButton
                    orderId={c.id}
                    sellerId={user?.id || ""}
                    bookTitle={c.bookTitle}
                    buyerName={c.buyerName}
                    onCommitSuccess={() => refreshPendingCommits().catch(() => {})}
                    disabled={isCommitting || isDeclining}
                  />
                  <Button
                    variant="outline"
                    disabled={isCommitting || isDeclining}
                    onClick={async (e) => {
                      e.preventDefault();
                      try { await declineBook(c.id); await refreshPendingCommits(); } catch {}
                    }}
                    className="border-book-300 text-book-700 hover:bg-book-50"
                  >
                    {isDeclining ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Declining...</>
                    ) : (
                      <><X className="h-4 w-4 mr-1" />Decline</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const Profile = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeListings, setActiveListings] = useState<Book[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
    const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [deletingBooks, setDeletingBooks] = useState<Set<string>>(new Set());
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // Transparency modal removed; use /transparency page instead
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [phone, setPhone] = useState<string>(
    (profile as any)?.phone_number || (user?.user_metadata as any)?.phone_number || (user?.user_metadata as any)?.phone || ""
  );

  const [profilePictureUrl, setProfilePictureUrl] = useState<string>(
    (user?.user_metadata as any)?.avatar_url || (profile as any)?.avatar_url || ""
  );
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const { pendingCommits } = useCommit();
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailChangeState, setEmailChangeState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailChangeError, setEmailChangeError] = useState("");
  const lastLoadedListingsUserIdRef = useRef<string | null>(null);
  const lastLoadedAddressesUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    setPhone((profile as any)?.phone_number || (user?.user_metadata as any)?.phone_number || (user?.user_metadata as any)?.phone || "");
    setProfilePictureUrl((user?.user_metadata as any)?.avatar_url || (profile as any)?.avatar_url || "");
  }, [user, profile]);

  // Handle URL params for deep-linking (e.g., from Order chat buttons)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const convId = params.get("conversation");

    if (tab) {
      setActiveTab(tab);
    }

    if (tab === "messages" && convId) {
      // Load conversations and find the matching one
      if (user?.id) {
        import("@/services/chatService").then(({ getUserConversations }) => {
          getUserConversations(user.id).then((convs) => {
            const match = convs.find((c) => c.id === convId);
            if (match) setSelectedConversation(match);
          }).catch(() => {});
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const loadActiveListings = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoadingListings(true);
      const books = await getUserBooks(user.id);
      const activeBooks = Array.isArray(books)
        ? books.filter((book) => !book.sold)
        : [];
      setActiveListings(activeBooks);
    } catch (error) {
      toast.error("Failed to load active listings");
      setActiveListings([]);
    } finally {
      setIsLoadingListings(false);
    }
  }, [user?.id]);

  const loadUserAddresses = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoadingAddress(true);

      // Quick UI: try local cache first to avoid blank loading on mobile
      try {
        const cacheKey = `cached_address_${user.id}`;
        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
        if (cached) {
          setAddressData(JSON.parse(cached));
        }
      } catch (cacheErr) {
        // ignore cache errors
      }

      try {
        const data = await getUserAddresses(user.id);
        setAddressData(data);

        // Update cache for next fast load
        try {
          const cacheKey = `cached_address_${user.id}`;
          if (typeof window !== 'undefined') {
            if (data) {
              localStorage.setItem(cacheKey, JSON.stringify(data));
            } else {
              localStorage.removeItem(cacheKey);
            }
          }
        } catch (cacheErr) {
          // ignore cache failures
        }
      } catch (fetchError) {
        // Network errors are expected - don't spam toasts, just log
        const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        console.warn('Address load failed:', errorMsg);

        // Only show error if we don't have cached data
        if (!addressData) {
          const formattedError = handleAddressError(fetchError, "load");
          toast.error(formattedError.userMessage);
        }
      }
    } catch (error) {
      const formattedError = handleAddressError(error, "load");
      toast.error(formattedError.userMessage);
    } finally {
      setIsLoadingAddress(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      if (lastLoadedListingsUserIdRef.current !== user.id) {
        lastLoadedListingsUserIdRef.current = user.id;
        loadActiveListings();
      }
      if (lastLoadedAddressesUserIdRef.current !== user.id) {
        lastLoadedAddressesUserIdRef.current = user.id;
        loadUserAddresses();
      }
    }
  }, [user?.id, loadActiveListings, loadUserAddresses]);

  // Ensure addresses refresh when navigating back to the Addresses tab
  useEffect(() => {
    if (activeTab === 'addresses' && user?.id) {
      loadUserAddresses();
    }
  }, [activeTab, user?.id, loadUserAddresses]);

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!bookId) {
      toast.error("Book ID is missing");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${bookTitle}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingBooks((prev) => new Set(prev).add(bookId));

    try {
      await deleteBook(bookId, false); // Normal delete first
      toast.success("Book deleted successfully");
      await loadActiveListings();
    } catch (error: unknown) {
      // If deletion failed due to active orders, offer force delete option for admins
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("active order(s)") && profile?.is_admin) {
        const forceConfirm = confirm(
          `${errorMessage}\n\nAs an admin, you can force delete this book which will:\n` +
          "• Cancel all active orders for this book\n" +
          "• Trigger refunds for buyers\n" +
          "• Permanently remove the book\n\n" +
          "Do you want to force delete?"
        );

        if (forceConfirm) {
          try {
            await deleteBook(bookId, true); // Force delete
            toast.success("Book force deleted successfully - orders cancelled and refunds initiated");
            await loadActiveListings();
          } catch (forceError: unknown) {
            const forceErrorMessage = forceError instanceof Error ? forceError.message : String(forceError);
            toast.error(`Force delete failed: ${forceErrorMessage}`);
          }
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to delete book: ${errorMessage}`);
      }
    } finally {
      setDeletingBooks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(bookId);
        return newSet;
      });
    }
  };

  const handleEditBook = (bookId: string, book?: Book) => {
    if (!bookId) {
      toast.error("Book ID is missing");
      return;
    }
    // Route to the appropriate edit page based on item type
    if (book?.itemType === 'uniform') {
      navigate(`/edit-uniform/${bookId}`);
    } else if (book?.itemType === 'school_supply') {
      navigate(`/edit-supply/${bookId}`);
    } else {
      navigate(`/edit-book/${bookId}`);
    }
  };

  const handleSaveAddresses = async (
    pickup: Address,
    shipping: Address,
    same: boolean,
  ) => {
    if (!user?.id) return;

    if (!addressData) {
      setIsLoadingAddress(true);
    }

    // Detect if this is a deletion operation
    const isPickupBeingDeleted = !!(
      addressData?.pickup_address &&
      !(pickup.street || pickup.streetAddress) &&
      !pickup.city
    );
    const isShippingBeingDeleted = !!(
      addressData?.shipping_address &&
      !(shipping.street || shipping.streetAddress) &&
      !shipping.city
    );
    const isDeletion = isPickupBeingDeleted || isShippingBeingDeleted;

    try {
      await saveUserAddresses(user.id, pickup, shipping, same);

      // Show success immediately — reload is best-effort
      toast.success(isDeletion ? "Address deleted successfully" : "Addresses saved successfully");

      // Reload addresses silently — don't let errors here show a failure toast
      try {
        await loadUserAddresses();
      } catch (reloadError) {
        // Silently ignore reload errors — the save already succeeded
        console.warn("Address reload after save had an issue:", reloadError);
      }

      // Update all user's book listings with the new pickup address (or clear it if deleted)
      try {
        await updateBooksPickupAddress(user.id, pickup);
      } catch (bookUpdateError) {
        // Don't fail the whole operation if book updates fail
      }
    } catch (error) {
      const operation = isDeletion ? "delete" : "save";
      const formattedError = handleAddressError(error, operation);
      toast.error(formattedError.userMessage);
      throw error;
    } finally {
      setIsLoadingAddress(false);
    }
  };

  if (!profile || !user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-book-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const stats = {
    totalBooks: activeListings.length,
    totalValue: activeListings.reduce(
      (sum, book) => sum + (book.price || 0),
      0,
    ),
    avgPrice:
      activeListings.length > 0
        ? activeListings.reduce((sum, book) => sum + (book.price || 0), 0) /
          activeListings.length
        : 0,
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <div className="mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center md:items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-book-100 text-book-600 text-xl font-semibold">
                    {(
                      (profile.full_name || profile.name || "U")
                      .charAt(0)
                      ?.toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 text-left">
                      {profile.full_name || profile.name || "Anonymous User"}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Joined{" "}
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                            })
                          : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-book-600" />
                      <span className="font-semibold">{stats.totalBooks}</span>
                      <span className="text-gray-600">Items Listed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-semibold">
                        R{stats.totalValue.toFixed(0)}
                      </span>
                      <span className="text-gray-600">Total Value</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate("/create-listing")}
                    className="bg-book-600 hover:bg-book-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    List an Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {!isMobile && "Overview"}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2 relative">
              <MessageSquare className="w-4 h-4" />
              {!isMobile && "My Chats"}
              {hasUnreadMessages && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 relative">
              <Package className="w-4 h-4" />
              {!isMobile && "Activity"}
              {pendingCommits && pendingCommits.length > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {!isMobile && "Settings"}
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {!isMobile && "Addresses"}
            </TabsTrigger>
          </TabsList>

                    {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Share Your Profile */}
            <Card className="bg-gradient-to-r from-book-50 to-book-100 border-book-200">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-book-800">
                      Share Your ReBooked Mini Page
                    </h3>
                    <p className="text-book-700 text-sm">
                      Share your profile to help your items sell faster! Post it on social media, send to classmates, or share in study groups.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsShareDialogOpen(true)}
                    className="bg-book-600 hover:bg-book-700 text-white w-full md:w-auto flex-shrink-0"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalBooks}</p>
                      <p className="text-gray-600">Active Listings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        R{stats.totalValue.toFixed(0)}
                      </p>
                      <p className="text-gray-600">Total Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        R{stats.avgPrice.toFixed(0)}
                      </p>
                      <p className="text-gray-600">Avg Price</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
                        </div>

            {/* My Listings Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Listings ({activeListings.length})</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/create-listing")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Listing
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingListings ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-book-600 mx-auto" />
                    <p className="text-gray-600 mt-2">Loading your items...</p>
                  </div>
                ) : activeListings.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-6">You haven't listed any items yet.</p>
                    <Button
                      onClick={() => navigate("/create-listing")}
                      className="bg-book-600 hover:bg-book-700"
                    >
                      List Your First Item
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeListings.map((book) => (
                      <Card key={book.id} className="overflow-hidden border-gray-100 hover:shadow-md transition-shadow">
                        <div className="aspect-[4/5] relative bg-gray-100">
                          <img
                            src={book.frontCover || book.imageUrl || "/placeholder.svg"}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Badge className="bg-white/90 text-book-600 border-none backdrop-blur-sm">
                              R{book.price}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <h4 className="font-semibold text-sm line-clamp-1 mb-1">{book.title}</h4>
                          <p className="text-xs text-gray-500 mb-3 truncate">by {book.author}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditBook(book.id, book)}
                              className="flex-1 h-8 text-xs"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              disabled={deletingBooks.has(book.id)}
                              className="flex-1 h-8 text-xs text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Listings Tab Content Removed and replaced by Messages */}

          {/* Messages Tab */}
          <TabsContent value="messages" className="m-0">
            <Card className="h-[600px] overflow-hidden border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                {/* Chat List */}
                <div className={`border-r border-gray-100 h-full ${selectedConversation ? 'hidden md:block' : 'block'}`}>
                  <ChatList
                    onSelectConversation={setSelectedConversation}
                    selectedId={selectedConversation?.id}
                    onUnreadChange={setHasUnreadMessages}
                    userProfilePicture={profilePictureUrl}
                  />
                </div>

                {/* Chat View */}
                <div className={`md:col-span-2 h-full bg-gray-50/30 ${selectedConversation ? 'block' : 'hidden md:flex md:items-center md:justify-center'}`}>
                  {selectedConversation ? (
                    <ChatView
                      conversation={selectedConversation}
                      onBack={() => setSelectedConversation(null)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="h-8 w-8 text-gray-300" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Select a conversation</h3>
                      <p className="text-sm text-gray-500 max-w-xs">
                        Select a message from the list to view the conversation and start chatting.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Tabs defaultValue="commits" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="commits" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Commits
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" /> Ongoing Orders
                </TabsTrigger>
              </TabsList>

              <TabsContent value="commits" className="space-y-4">
                <ActivityCommits />
              </TabsContent>

              <TabsContent value="orders">
                <OrderManagementView />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-start">
                  {/* Profile Picture Upload Section */}
                  <div className="flex flex-col items-center gap-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Profile Picture
                    </label>
                    <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                      {profilePictureUrl ? (
                        <img
                          src={profilePictureUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold text-gray-400">
                          {(profile?.name || user?.email || "?")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      )}
                      <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <Upload className="w-5 h-5 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingProfilePicture}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            try {
                              setIsUploadingProfilePicture(true);
                              const timestamp = Date.now();
                              const filename = `profile-${user?.id}-${timestamp}.jpg`;

                              const { data, error: uploadError } = await supabase.storage
                                .from("user-profiles")
                                .upload(filename, file, { upsert: true });

                              if (uploadError) throw uploadError;

                              const { data: urlData } = supabase.storage
                                .from("user-profiles")
                                .getPublicUrl(filename);

                              const publicUrl = urlData?.publicUrl;

                              if (publicUrl) {
                                const { error: metaError } = await supabase.auth.updateUser({
                                  data: { avatar_url: publicUrl },
                                });

                                if (metaError) throw metaError;

                                if (user?.id) {
                                  const { error: profileError } = await supabase
                                    .from("profiles")
                                    .update({ avatar_url: publicUrl })
                                    .eq("id", user.id);

                                  if (profileError) throw profileError;
                                }

                                setProfilePictureUrl(publicUrl);
                                toast.success("Profile picture updated!");
                              }
                            } catch (err) {
                              console.error("Profile picture upload error:", err);
                              toast.error("Failed to upload profile picture");
                            } finally {
                              setIsUploadingProfilePicture(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 text-center">Click to upload<br />JPG, PNG, GIF</p>
                  </div>

                  {/* Name Edit Section */}
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={profile.name || ""}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditDialogOpen(true)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      value={user.email || ""}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setNewEmail(""); setEmailChangeState("idle"); setEmailChangeError(""); setShowEmailChangeDialog(true); }}
                    >
                      Change
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">A confirmation link will be sent to your new email.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => {
                          const raw = e.target.value || "";
                          const digits = raw.replace(/\D/g, "");
                          let normalized = digits;
                          if (raw.trim().startsWith("+27") || digits.startsWith("27")) {
                            normalized = ("0" + digits.slice(2));
                          }
                          setPhone(normalized.slice(0, 10));
                        }}
                        placeholder="e.g., 0812345678"
                        className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md"
                      />
                      {phone && !/^0\d{9}$/.test(phone) && (
                        <p className="text-xs text-amber-600 mt-1 pl-10">
                          South African numbers should start with 0 and be 10 digits.
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const digits = (phone || "").replace(/\D/g, "");
                          const normalized = digits.startsWith("27") ? ("0" + digits.slice(2)) : digits;
                          const phoneTrim = normalized.slice(0, 10);
                          if (!phoneTrim) { toast.error("Please enter a phone number"); return; }
                          if (!/^0\d{9}$/.test(phoneTrim)) {
                            const proceed = window.confirm(
                              "Are you sure your number is correct? South African numbers should start with 0 and be 10 digits. An incorrect number may cause delivery failures."
                            );
                            if (!proceed) return;
                          }
                          // If overwriting existing number, warn user
                          const existing = (profile as any)?.phone_number;
                          if (existing && existing !== phoneTrim) {
                            const proceed = window.confirm(
                              `You are changing your phone number from ${existing} to ${phoneTrim}. This affects delivery communications. Continue?`
                            );
                            if (!proceed) return;
                          }
                          const { error } = await supabase.auth.updateUser({ data: { phone_number: phoneTrim, phone: phoneTrim } });
                          if (error) throw error;
                          if (user?.id) {
                            const { error: profileErr } = await supabase
                              .from('profiles')
                              .update({ phone_number: phoneTrim })
                              .eq('id', user.id);
                            if (profileErr) throw profileErr;
                          }
                          toast.success("Phone number updated!");
                        } catch (err) {
                          toast.error("Failed to update phone number");
                        }
                      }}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used for delivery updates and account security.</p>
                  <p className="text-xs text-amber-600 mt-1 flex items-start gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>⚠️ Please double-check that your number is correct. An incorrect phone number can cause delivery failures and missed notifications — you may need to pay for re-scheduling.</span>
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Banking Information</h3>
                  <BankingProfileTab />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Addresses</CardTitle>
              </CardHeader>
              <CardContent>
                <ModernAddressTab
                  addressData={addressData}
                  onSaveAddresses={handleSaveAddresses}
                  isLoading={isLoadingAddress}
                />
              </CardContent>
            </Card>
          </TabsContent>
                </Tabs>
      </div>

      <ShareProfileDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        userId={user?.id || ""}
        userName={[(profile as any)?.first_name, (profile as any)?.last_name].filter(Boolean).join(" ") || profile?.name || "Anonymous User"}
        isOwnProfile={true}
        userProfilePicture={profilePictureUrl}
      />

      <ProfileEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
      />

      {/* Email Change Dialog */}
      {showEmailChangeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            {emailChangeState === "sent" ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Check your new email</h3>
                <p className="text-sm text-gray-600">
                  A confirmation link has been sent to <strong>{newEmail}</strong>. Click the link in that email to confirm the change.
                </p>
                <p className="text-xs text-gray-500">Your email will only change after you click the confirmation link.</p>
                <Button onClick={() => setShowEmailChangeDialog(false)} className="w-full bg-book-600 hover:bg-book-700 rounded-xl">
                  Done
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Change Email Address</h3>
                <p className="text-sm text-gray-500 mb-4">Enter your new email address. We'll send a confirmation link.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Current Email</label>
                    <input type="email" value={user.email || ""} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">New Email Address</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="newaddress@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-book-500"
                      autoFocus
                    />
                  </div>
                  {emailChangeError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {emailChangeError}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-5">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowEmailChangeDialog(false)} disabled={emailChangeState === "sending"}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-book-600 hover:bg-book-700 rounded-xl"
                    disabled={!newEmail.trim() || emailChangeState === "sending"}
                    onClick={async () => {
                      if (!newEmail.includes("@")) { setEmailChangeError("Please enter a valid email address."); return; }
                      if (newEmail.trim().toLowerCase() === (user.email || "").toLowerCase()) { setEmailChangeError("New email must be different from your current email."); return; }
                      setEmailChangeError("");
                      setEmailChangeState("sending");
                      try {
                        const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
                        if (error) throw error;
                        setEmailChangeState("sent");
                      } catch (err: any) {
                        setEmailChangeState("error");
                        setEmailChangeError(err?.message || "Failed to initiate email change.");
                      }
                    }}
                  >
                    {emailChangeState === "sending" ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Sending...</> : "Send Confirmation"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transparency modal removed; use /transparency page */}
    </Layout>
  );
};

export default Profile;
