import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  MapPin,
  Calendar,
  BookOpen,
  Star,
  ArrowLeft,
  Share2,
  School,
  GraduationCap,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Book } from "@/types/book";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import Layout from "@/components/Layout";
import { getProvinceFromLocker } from "@/utils/provinceExtractorUtils";
import SellerRating from "@/components/reviews/SellerRating";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewForm from "@/components/reviews/ReviewForm";
import { reviewService } from "@/services/reviewService";
import { useAuth } from "@/contexts/AuthContext";
import { getOptimizedImageUrl } from "@/utils/imageOptimization";

import { getUserBooks } from "@/services/book/bookQueries";

interface SellerProfile {
  id: string;
  name: string;
  email: string;
  bio?: string;
  profile_picture_url?: string;
  created_at: string;
  province?: string;
  hasName?: boolean;
}

const SellerProfile = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("listings");

  const [canUserReview, setCanUserReview] = useState(false);
  const [hasUserReview, setHasUserReview] = useState(false);
  const [refreshReviewsTrigger, setRefreshReviewsTrigger] = useState(0);

  useEffect(() => {
    if (!sellerId) {
      setError("Seller ID not provided");
      setLoading(false);
      return;
    }

    fetchSellerData();
    checkReviewEligibility();
  }, [sellerId, user]);

  const checkReviewEligibility = async () => {
    if (!user || !sellerId) {
      setCanUserReview(false);
      setHasUserReview(false);
      return;
    }
    try {
      const [eligible, existingReview] = await Promise.all([
        reviewService.canUserReviewSeller(sellerId),
        reviewService.getUserReviewForSeller(sellerId),
      ]);
      setCanUserReview(eligible);
      setHasUserReview(!!existingReview);
    } catch (err) {
      console.warn("Failed to fetch review eligibility", err);
    }
  };

  const fetchSellerData = async () => {
    try {
      setLoading(true);

      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, bio, profile_picture_url, created_at, preferred_delivery_locker_data")
        .eq("id", sellerId)
        .maybeSingle();

      const displayName = [sellerData?.first_name, sellerData?.last_name].filter(Boolean).join(" ") || (sellerData as any)?.name || (sellerData as any)?.full_name || sellerData?.email?.split("@")[0] || "";
      
      if (sellerData) {
        setSeller({ ...(sellerData as any), name: displayName, province: undefined, hasName: Boolean(displayName) });
      } else {
        setSeller({ id: sellerId!, name: displayName, email: "", created_at: new Date().toISOString(), province: undefined, hasName: false });
      }

      // Fetch seller's items using the unified service
      const fetchedListings = await getUserBooks(sellerId!);
      const activeListings = fetchedListings.filter(item => !item.sold);
      setListings(activeListings);

      // Resolve province with proper fallback logic
      let resolvedProvince: string | null = null;

      // First, try to get province from seller's locker data
      if (sellerData?.preferred_delivery_locker_data) {
        resolvedProvince = getProvinceFromLocker(sellerData.preferred_delivery_locker_data);
      }

      // Fallback to first item's province if no locker province
      if (!resolvedProvince) {
        resolvedProvince = activeListings.find((b) => !!b.province)?.province || null;
      }

      if (resolvedProvince) {
        setSeller((prev) => (prev ? { ...prev, province: resolvedProvince } : prev));
      }

      if (!sellerData && activeListings.length === 0) {
        throw new Error("Seller not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: Book) => {
    addToCart(item);
  };

  const handleItemClick = (itemId: string, itemType?: string) => {
    // Navigate to the appropriate detail page
    if (itemType === 'uniform') {
      navigate(`/school-uniform/${itemId}`);
    } else if (itemType === 'school_supply') {
      navigate(`/supplies/${itemId}`);
    } else {
      navigate(`/textbook/${itemId}`);
    }
  };

  const handleBackToMarketplace = () => {
    navigate("/listings");
  };

  const handleShareProfile = async () => {
    if (!seller) return;

    const profileUrl = `${window.location.origin}/seller/${seller.id}`;
    const titleText = seller.name && seller.name.trim().length > 0 ? `${seller.name} ReBooked Mini` : "ReBooked Mini";
    const shareData = {
      title: titleText,
      text: seller.hasName && seller.name
        ? `Check out ${seller.name}'s items on ReBooked! They have ${listings.length} items available.`
        : `Check out this seller's listings on ReBooked! They have ${listings.length} items available.`,
      url: profileUrl,
    };

    try { await navigator.clipboard.writeText(profileUrl); } catch {}

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Link copied • Share sheet opened");
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
      }
    }

    toast.success("Profile link copied to clipboard!");
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-book-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !seller) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Seller Not Found
              </h2>
              <p className="text-gray-600 mb-4">
                {error ||
                  "The seller profile you're looking for doesn't exist."}
              </p>
              <Button onClick={() => navigate("/listings")} variant="outline">
                Browse All Listings
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const memberSince = new Date(seller.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Back to Marketplace Button */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button
              onClick={handleBackToMarketplace}
              variant="outline"
              className="flex items-center gap-2 hover:bg-book-50 hover:border-book-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Marketplace
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="rounded-xl border shadow-sm p-4 sm:p-6 bg-gradient-to-br from-book-50 to-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start">
                {/* Avatar + Info */}
                <div className="flex items-start md:items-start gap-4 md:col-span-2 min-w-0 text-left">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                    <AvatarImage src={seller.profile_picture_url} />
                    <AvatarFallback className="bg-book-100 text-book-700 text-lg">
                      {(seller.name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words md:text-left">
                      {seller.name && seller.name.trim().length > 0 ? seller.name : "ReBooked"}
                    </h1>
                    <div className="text-sm sm:text-base font-semibold text-book-800 mt-0.5 md:text-left">ReBooked Mini</div>
                    <div className="mt-2 flex flex-col gap-1.5 text-sm text-gray-600 md:text-left">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="break-words">Member since {memberSince}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="break-words">{seller.province || "Province not set"}</span>
                      </div>
                    </div>
                    {seller.bio && (
                      <p className="text-gray-700 mt-2 max-w-none whitespace-pre-line break-words">
                        {seller.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats + Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-start md:items-start gap-3 md:gap-4">
                  <div className="flex sm:block justify-between text-left sm:text-left gap-4 sm:gap-0">
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Items Available</div>
                      <div className="text-xl sm:text-2xl font-bold text-book-700">{listings.length}</div>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Seller Rating</div>
                      <div className="mt-1">
                        <SellerRating sellerId={seller.id} showLabel={false} />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleShareProfile}
                    variant="outline"
                    className="justify-center sm:justify-start flex items-center gap-2 hover:bg-book-50 hover:border-book-300 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Share Profile</span>
                    <span className="sm:hidden">Share</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content with Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="listings" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Listings {listings.length > 0 && `(${listings.length})`}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Reviews
              </TabsTrigger>
            </TabsList>

            {/* Listings Tab */}
            <TabsContent value="listings" className="space-y-6">
              {listings.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Listings Available
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {seller.name} doesn't have any items for sale at the moment.
                    </p>
                    <Button onClick={() => navigate("/listings")} variant="outline">
                      Browse Other Listings
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="mb-6 text-left">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Items for Sale
                    </h2>
                    <p className="text-gray-600">
                      All listings by {seller.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {listings.map((item) => {
                      const optimizedSrc = getOptimizedImageUrl(item.imageUrl || item.frontCover, {
                        width: 400,
                        height: 300,
                        quality: 80,
                        format: "auto",
                      });

                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-200 book-card-hover flex flex-col relative group cursor-pointer text-left"
                          onClick={() => handleItemClick(item.id, item.itemType)}
                        >
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={optimizedSrc}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop&auto=format&q=80";
                              }}
                            />
                            <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-sm font-semibold text-book-800">
                              R{item.price.toLocaleString()}
                            </div>
                          </div>
                          <div className="p-4 flex-grow flex flex-col">
                            <h3 className="font-bold text-lg mb-1 text-book-800 line-clamp-1">
                              {item.title}
                            </h3>
                            <p className="text-gray-600 mb-2">{item.author}</p>
                            <p className="text-gray-500 text-sm mb-3 line-clamp-2 flex-grow">
                              {item.description}
                            </p>

                            {/* Tags and badges */}
                            <div className="flex flex-wrap items-center gap-2 mt-auto">
                              <span className="bg-book-100 text-book-800 px-2 py-1 rounded text-xs font-medium">
                                {item.itemType === "uniform" ? "Uniform" : item.itemType === "school_supply" ? "Supply" : item.condition} {item.itemType === "reader" && "reader"}
                              </span>
                              {item.schoolName && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium flex items-center">
                                  <School className="h-3 w-3 mr-1" />
                                  {item.schoolName}
                                </span>
                              )}
                              {item.grade && (
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-medium flex items-center">
                                  <School className="h-3 w-3 mr-1" />
                                  {item.grade}
                                </span>
                              )}
                              {item.universityYear && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium flex items-center">
                                  <GraduationCap className="h-3 w-3 mr-1" />
                                  {item.universityYear}
                                </span>
                              )}
                              {item.itemType !== "uniform" && item.itemType !== "school_supply" && (
                                <span className="text-gray-500 text-xs ml-auto">
                                  {item.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-6">
              <div className="mb-6 text-left">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Seller Reviews
                </h2>
                <p className="text-gray-600">
                  What buyers say about {seller.name}
                </p>
              </div>

              {(canUserReview || hasUserReview) && (
                <div className="mb-8 text-left">
                  <ReviewForm
                    sellerId={seller.id}
                    onReviewSubmitted={() => {
                      setRefreshReviewsTrigger(prev => prev + 1);
                      fetchSellerData();
                      checkReviewEligibility();
                    }}
                  />
                </div>
              )}

              <ReviewList key={refreshReviewsTrigger} sellerId={seller.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default SellerProfile;

