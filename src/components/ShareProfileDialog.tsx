import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Share2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ActivityService } from "@/services/activityService";
import { supabase } from "@/integrations/supabase/client";
import debugLogger from "@/utils/debugLogger";

interface ShareProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  isOwnProfile: boolean;
  userProfilePicture?: string;
}

const ShareProfileDialog = ({
  isOpen,
  onClose,
  userId,
  userName,
  isOwnProfile,
  userProfilePicture,
}: ShareProfileDialogProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const profileUrl = `${window.location.origin}/seller/${userId}`;

  // Get current authenticated user's ID for activity tracking
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch (error) {
        setCurrentUserId(null);
      }
    };

    if (isOpen) {
      getCurrentUser();
    }
  }, [isOpen]);

  const copyProfileLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(profileUrl);
      } else {
        // Fallback for environments where clipboard API is restricted
        const textArea = document.createElement('textarea');
        textArea.value = profileUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      // Track link copy (non-blocking) - only if user is signed in
      if (currentUserId) {
        try {
          await ActivityService.trackMiniLinkShare(userId, currentUserId);
        } catch (trackingError) {
          debugLogger.error("ShareProfileDialog", "Error tracking link share:", trackingError);
        }
      }

      toast.success("Profile link copied! 📋 Share it everywhere to sell faster!");
    } catch (error) {
      toast.error("Couldn't copy link automatically. Please copy it manually from the input field.");
    }
  };

  const shareToSocial = async (platform: string) => {
    const text = `Check out ${userName}'s textbook listings on Rebooked Solutions!`;

    let shareUrl = "";

    switch (platform) {
      case "x":
        // X uses Twitter's intent endpoint for composing tweets/updates
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + profileUrl)}`;
        break;
      case "instagram": {
        // Instagram doesn't support direct URL sharing, so we copy the text and URL
        const instagramText = `${text}\n\n${profileUrl}`;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(instagramText);
          } else {
            // Fallback for restricted environments
            const textArea = document.createElement('textarea');
            textArea.value = instagramText;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
          }
          // Track share (non-blocking) - only if user is signed in
          if (currentUserId) {
            try {
              await ActivityService.trackSocialShare(userId, currentUserId, platform);
            } catch (trackingError) {
              debugLogger.error("ShareProfileDialog", "Error tracking social share:", trackingError);
            }
          }
          toast.success(
            "Text and link copied! Paste it in your Instagram story or post.",
          );
        } catch (error) {
          toast.success("Opening Instagram... You can manually copy the profile link from above!");
        }
        return;
      }
      default:
        return;
    }

    // Track share (non-blocking) - only if user is signed in
    if (currentUserId) {
      try {
        await ActivityService.trackSocialShare(userId, currentUserId, platform);
      } catch (trackingError) {
        debugLogger.error("ShareProfileDialog", "Error tracking social share:", trackingError);
      }
    }

    window.open(shareUrl, "_blank", "width=600,height=400");
    toast.success("Great! 🚀 Sharing your profile helps sell books faster!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-md mx-auto my-auto">
                <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share2 className="h-5 w-5 text-book-600 mr-2" />
            Share Your ReBooked Mini
          </DialogTitle>
                    <DialogDescription>
            {isOwnProfile ? (
              <>
                <span className="block">🚀 Share your profile to sell your items faster!</span>
                <span className="block text-sm text-gray-600 mt-1">Post it on social media, send to classmates, or share in study groups - the more people see your books, the quicker they'll sell.</span>
              </>
            ) : (
              <>Help {userName} sell their books by sharing their profile!</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ReBooked Mini Preview Card */}
          <div className="border border-book-200 rounded-lg p-4 bg-gradient-to-br from-book-50 to-white">
            <h3 className="text-xs font-semibold text-book-600 mb-3 uppercase tracking-wide">Your ReBooked Mini Card</h3>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-book-100">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-book-100 flex-shrink-0 border-2 border-book-200 flex items-center justify-center">
                {userProfilePicture ? (
                  <img
                    src={userProfilePicture}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-book-600">
                    {userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-book-900 truncate">{userName}</p>
                <p className="text-xs text-book-600">ReBooked Solutions</p>
                <div className="flex gap-1 mt-1">
                  <div className="h-1 w-8 bg-book-200 rounded-full"></div>
                  <div className="h-1 w-8 bg-book-200 rounded-full opacity-50"></div>
                  <div className="h-1 w-8 bg-book-200 rounded-full opacity-30"></div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Profile Link
            </Label>
            <div className="flex items-center space-x-2">
              <Input readOnly value={profileUrl} className="flex-1 text-sm" />
              <Button variant="outline" size="sm" onClick={copyProfileLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Share on Social Media
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => shareToSocial("x")}
                className="flex items-center justify-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                X
              </Button>
              <Button
                variant="outline"
                onClick={() => shareToSocial("facebook")}
                className="flex items-center justify-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Facebook
              </Button>
              <Button
                variant="outline"
                onClick={() => shareToSocial("whatsapp")}
                className="flex items-center justify-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => shareToSocial("instagram")}
                className="flex items-center justify-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                Instagram
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProfileDialog;
