import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, CreditCard, Edit, Clock, Share2, Heart } from "lucide-react";
import { Book } from "@/types/book";
import { UserProfile } from "@/types/address"; // UserProfile includes id
import { toast } from "sonner";

interface BookActionsProps {
  book: Book;
  user: UserProfile | null;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onEditBook: () => void;
  onCommit?: () => void;
  onShare: () => void;
  onViewSellerProfile: () => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
  showCommitButton?: boolean;
}

const BookActions = ({
  book,
  user,
  onBuyNow,
  onAddToCart,
  onEditBook,
  onCommit,
  onShare,
  onViewSellerProfile,
  onToggleWishlist,
  isWishlisted = false,
  showCommitButton = false,
}: BookActionsProps) => {
  const isOwner = user?.id === book.seller?.id; // seller is an object with id
  const isSold = book.sold;
  const isPendingCommit = book.status === "pending_commit" || showCommitButton;
  const isSellerAway = !!book.seller?.is_away;

  return (
    <Card className="sticky top-4">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Price Section */}
          <div className="text-center p-4 bg-book-50 rounded-lg border">
            <div className="text-3xl font-bold text-book-600 mb-2">
              R{book.price?.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">Final Price</p>
          </div>

          {/* Action Buttons */}
          {isSold ? (
            <div className="text-center p-4 bg-gray-100 rounded-lg">
              <p className="text-gray-600 font-medium">
                This item has been sold
              </p>
            </div>
          ) : isPendingCommit && isOwner && onCommit ? (
            <div className="space-y-3">
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Clock className="mx-auto h-5 w-5 text-orange-600 mb-2" />
                <p className="text-sm text-orange-800 font-medium">
                  Commit Required
                </p>
                <p className="text-xs text-orange-600">
                  Please confirm this sale within 48 hours
                </p>
              </div>
              <Button
                onClick={onCommit}
                className="w-full bg-book-600 hover:bg-book-700"
                size="lg"
              >
                <Clock className="mr-2 h-4 w-4" />
                Commit Sale
              </Button>
              <Button
                onClick={onEditBook}
                variant="outline"
                className="w-full border-book-600 text-book-600 hover:bg-book-50"
                size="sm"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Item
              </Button>
            </div>
          ) : isOwner ? (
            <Button
              onClick={onEditBook}
              className="w-full bg-book-600 hover:bg-book-700"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Item
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={onBuyNow}
                className="w-full bg-book-600 hover:bg-book-700"
                size="lg"
                disabled={isSellerAway}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isSellerAway ? "Seller is currently away" : "Buy Now"}
              </Button>
              <Button
                onClick={onAddToCart}
                variant="outline"
                className="w-full border-book-600 text-book-600 hover:bg-book-50"
                size="lg"
                disabled={isSellerAway}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
              {isSellerAway && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Seller is currently away. You can wishlist this item and we will notify you when they are back.
                </p>
              )}
            </div>
          )}

          {/* Secondary Actions */}
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <Button
              onClick={onShare}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share Item
            </Button>

            {/* Wishlist button placed here (below Share) */}
            {onToggleWishlist && (
              <Button
                onClick={onToggleWishlist}
                size="sm"
                className={`w-full ${isWishlisted ? 'bg-pink-600 text-white hover:bg-pink-700' : ''}`}
                variant={isWishlisted ? undefined : 'outline'}
              >
                <Heart className="mr-2 h-4 w-4" />
                {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookActions;
