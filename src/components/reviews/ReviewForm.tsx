import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { reviewService } from "@/services/reviewService";
import { useAuth } from "@/contexts/AuthContext";
import { Star, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import debugLogger from "@/utils/debugLogger";

interface ReviewFormProps {
  sellerId: string;
  onReviewSubmitted?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  sellerId,
  onReviewSubmitted,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [userReview, setUserReview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [eligible, existingReview] = await Promise.all([
          reviewService.canUserReviewSeller(sellerId),
          reviewService.getUserReviewForSeller(sellerId),
        ]);

        setCanReview(eligible);
        if (existingReview) {
          setUserReview(existingReview);
          setRating(existingReview.rating);
          setComment(existingReview.comment || "");
          setIsAnonymous(existingReview.is_anonymous);
        }
      } catch (err) {
        debugLogger.error("ReviewForm", "Error checking eligibility:", err);
        setError("Failed to check review eligibility");
      } finally {
        setIsLoading(false);
      }
    };

    checkEligibility();
  }, [sellerId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to leave a review");
      return;
    }

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      if (userReview) {
        // Update existing review
        await reviewService.updateReview(userReview.id, {
          rating,
          comment: comment.trim() || undefined,
          isAnonymous,
        });
        toast.success("Review updated successfully");
      } else {
        // Submit new review
        await reviewService.submitReview(sellerId, {
          rating,
          comment: comment.trim() || undefined,
          isAnonymous,
        });
        toast.success("Review submitted successfully");
      }

      onReviewSubmitted?.();
      // Reset form
      setRating(0);
      setComment("");
      setIsAnonymous(false);
    } catch (err: any) {
      debugLogger.error("ReviewForm", "Error submitting review:", err);
      toast.error(err.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-700">
            You must be logged in to leave a review.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!canReview && !userReview) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                You haven't purchased from this seller yet
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Only verified buyers (users with completed orders) can leave
                reviews.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {userReview ? "Edit Your Review" : "Leave a Review"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div>
            <Label className="block mb-3">Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <Label htmlFor="comment" className="block mb-2">
              Comment (Optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this seller..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Anonymity Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="anonymous" className="font-medium cursor-pointer">
                Post as Anonymous
              </Label>
              <p className="text-xs text-gray-600 mt-1">
                Your name and profile picture won't be visible
              </p>
            </div>
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : userReview ? (
              "Update Review"
            ) : (
              "Submit Review"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
