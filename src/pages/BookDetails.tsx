import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/ui/BackButton";
import { useCart } from "@/contexts/CartContext";
import Layout from "@/components/Layout";
import BookImageSection from "@/components/book-details/BookImageSection";
import BookInfo from "@/components/book-details/BookInfo";
import BookActions from "@/components/book-details/BookActions";
import BookPricing from "@/components/book-details/BookPricing";
import SellerInfo from "@/components/book-details/SellerInfo";
import ReportBookDialog from "@/components/ReportBookDialog";
import MoreFromCategory from "@/components/book-details/MoreFromCategory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, BookOpen } from "lucide-react";
import SEO from "@/components/SEO";
import { generateBookSEO } from "@/utils/seoUtils";
import { useBookDetails } from "@/hooks/useBookDetails";
import { extractBookId } from "@/utils/bookUtils";
import { toast } from "sonner";
import { ActivityService } from "@/services/activityService";
import { useBookTracking } from "@/hooks/useBookTracking";
import debugLogger from "@/utils/debugLogger";

const BookDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // Validate and debug book ID
  useEffect(() => {
    if (!id) {
      toast.error("Invalid item link - redirecting to browse");
      setTimeout(() => {
        navigate("/listings");
      }, 2000);
      return;
    }

    const validId = extractBookId(id);
  }, [id, navigate]);

  const { book, isLoading, error } = useBookDetails(id || "");

  const bookSEO = book ? generateBookSEO({
    title: book.title,
    author: book.author,
    price: book.price,
    description: book.description,
    imageUrl: book.imageUrl,
  }) : null;

  // Track book views and time spent
  useBookTracking({
    bookId: id || "",
    userId: user?.id,
  });

  const handleBuyNow = () => {
    if (!user) {
      toast.error("Please log in to purchase items");
      navigate("/login");
      return;
    }

    if (!book) return;

    if (book.sold) {
      toast.error("This item has already been sold");
      return;
    }

    if (typeof book.availableQuantity === 'number' && book.availableQuantity <= 0) {
      toast.error("This item is out of stock");
      return;
    }

    if (user.id === book.seller?.id) {
      toast.error("You cannot buy your own listing");
      return;
    }

    navigate(`/checkout/${book.id}`);
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please log in to add items to cart");
      navigate("/login");
      return;
    }

    if (!book) {
      toast.error("Item information is not available");
      return;
    }

    if (!book.seller || !book.seller.id) {
      toast.error("Seller information is not available");
      return;
    }

    if (book.sold) {
      toast.error("This item has already been sold");
      return;
    }

    if (user.id === book.seller.id) {
      toast.error("You cannot add your own listing to cart");
      return;
    }

    try {
      addToCart(book);

      // Track add to cart (non-blocking)
      try {
        await ActivityService.trackAddToCart(book.id, user.id, 1, book.price);
      } catch (trackingError) {
        debugLogger.error("BookDetails", "Error tracking add to cart:", trackingError);
      }
    } catch (error) {
      toast.error("Failed to add item to cart. Please try again.");
    }
  };

  const handleEditBook = () => {
    if (!book) return;
    // Route to the appropriate edit page based on item type
    if (book.itemType === 'uniform') {
      navigate(`/edit-uniform/${book.id}`);
    } else if (book.itemType === 'school_supply') {
      navigate(`/edit-supply/${book.id}`);
    } else {
      navigate(`/edit-book/${book.id}`);
    }
  };

  const handleShare = async () => {
    if (!book) return;

    const itemUrl = `${window.location.origin}/books/${book.id}`;
    const shareData = {
      title: book.title,
      text: `Check out this listing on ReBooked: ${book.title} for R${book.price}`,
      url: itemUrl,
    };

    try { await navigator.clipboard.writeText(itemUrl); } catch {}

    // Track share (non-blocking)
    try {
      await ActivityService.trackBookShare(book.id, user?.id);
    } catch (trackingError) {
      debugLogger.error("BookDetails", "Error tracking share:", trackingError);
    }

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

    toast.success("Item link copied to clipboard!");
  };

  const fallbackShare = (url?: string) => {
    const urlToShare = url || `${window.location.origin}/books/${book?.id}`;
    navigator.clipboard.writeText(urlToShare);
    toast.success("Item link copied to clipboard!");
  };

  const handleViewSellerProfile = () => {
    if (!book?.seller?.id) {
      toast.error("Seller profile not available");
      return;
    }
    navigate(`/seller/${book.seller.id}`);
  };

  const handleReportBook = () => {
    if (!user) {
      toast.error("Please log in to report a listing");
      navigate("/login");
      return;
    }
    setIsReportDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-book-600"></div>
            <p className="text-gray-600">Loading item details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state with better error handling
  if (error || !book) {
    const errorMessage = error || "Book not found or may have been removed";

    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px] max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              Item Not Available
            </h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <div className="space-y-3 w-full">
              <Button
                onClick={() => navigate("/listings")}
                className="bg-book-600 hover:bg-book-700 w-full min-h-[48px]"
                size="lg"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Browse All Listings
              </Button>
              <BackButton
                variant="outline"
                fallbackPath="/listings"
                className="w-full min-h-[48px]"
                size="lg"
              >
                Go Back
              </BackButton>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const isOwner = user?.id === book.seller?.id;
  const showCommissionDetails = false; // Never show commission details to anyone

  // JSON-LD Product structured data for rich results
  const productSchema = book ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: book.title,
    description: book.description,
    image: book.imageUrl,
    author: { "@type": "Person", name: book.author },
    offers: {
      "@type": "Offer",
      price: book.price,
      priceCurrency: "ZAR",
      availability: book.sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      itemCondition: book.condition === "New" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      seller: { "@type": "Organization", name: "ReBooked Solutions" },
    },
    ...(book.category ? { category: book.category } : {}),
    ...(book.isbn ? { isbn: book.isbn } : {}),
  } : null;

  return (
    <Layout>
      {bookSEO && (
        <SEO
          title={bookSEO.title}
          description={bookSEO.description}
          image={bookSEO.image}
          type="product"
          url={`${window.location.origin}/books/${book?.id}`}
        />
      )}
      {productSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-7xl">
        {/* Back button */}
        <div className="mb-3 sm:mb-4">
          <BackButton
            fallbackPath="/listings"
            className="text-book-600 hover:bg-book-50 p-2 sm:p-3 min-h-[44px]"
          >
            <span className="hidden sm:inline">Back</span>
          </BackButton>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-6 lg:gap-8 items-start">
          {/* Left column - Images only */}
          <div>
            <BookImageSection book={book} />
          </div>

          {/* Right column - All details and actions */}
          <div className="space-y-6">
            <BookInfo book={book} />

            <BookActions
              book={book}
              user={user}
              onBuyNow={handleBuyNow}
              onAddToCart={handleAddToCart}
              onEditBook={handleEditBook}
              onShare={handleShare}
              onViewSellerProfile={handleViewSellerProfile}
            />

            <SellerInfo
              seller={book.seller}
              onViewProfile={handleViewSellerProfile}
              bookId={book.id}
            />

            {!isOwner && (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReportBook}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Report Issue
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* More from this category */}
        {book.category && (
          <MoreFromCategory category={book.category} currentBookId={book.id} />
        )}


        <ReportBookDialog
          isOpen={isReportDialogOpen}
          onClose={() => setIsReportDialogOpen(false)}
          bookId={book.id}
          bookTitle={book.title}
          sellerId={book.seller?.id}
          sellerName={book.seller?.name}
        />
      </div>
    </Layout>
  );
};

export default BookDetails;
