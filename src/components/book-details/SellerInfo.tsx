import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Calendar, Store, Star, MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SellerRating from "@/components/reviews/SellerRating";
import { useStartConversation } from "@/hooks/useChat";

interface SellerInfoProps {
  seller: {
    id: string;
    name: string;
    email: string;
    createdAt?: string;
  };
  onViewProfile: () => void;
  bookId?: string;
}

const SellerInfo = ({ seller, onViewProfile, bookId }: SellerInfoProps) => {
  const navigate = useNavigate();
  const { startConversation, isStarting } = useStartConversation();

  const handleViewReviews = () => {
    navigate(`/seller/${seller.id}`);
  };

  const handleChatToSeller = async () => {
    if (!bookId) return;
    const conversationId = await startConversation(bookId, seller.id);
    if (conversationId) {
      navigate("/chats", { state: { conversationId } });
    }
  };

  const displayName = seller?.full_name || seller?.name || "Loading...";

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-3">About the Seller</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{displayName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Member since {seller?.createdAt ? new Date(seller.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              }) : "Unknown"}
            </span>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Star className="h-4 w-4 text-gray-500" />
            <SellerRating sellerId={seller.id} showLabel={true} />
          </div>
        </div>
          <div className="mt-4 space-y-3">
          {bookId && (
            <Button
              onClick={handleChatToSeller}
              disabled={isStarting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Chat to Seller
            </Button>
          )}
          <Button
            onClick={onViewProfile}
            className="w-full bg-book-600 hover:bg-book-700"
          >
            <Store className="h-4 w-4 mr-2" />
            View {displayName}'s ReBooked Mini
          </Button>
          <Button
            onClick={handleViewReviews}
            variant="outline"
            className="w-full border-book-300 text-book-700 hover:bg-book-50"
          >
            <Star className="h-4 w-4 mr-2" />
            See Reviews
          </Button>
          <div className="p-3 bg-book-50 rounded-lg">
            <p className="text-sm text-book-800">
              🛍️ See all items from this seller in their mini storefront
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SellerInfo;
