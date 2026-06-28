import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useChat";
import { Conversation } from "@/services/chatService";
import { MessageSquare, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string;
  defaultSelectedId?: string;
  onUnreadChange?: (hasUnread: boolean) => void;
  userProfilePicture?: string;
}

function getDisplayName(profile?: { first_name: string | null; last_name: string | null; email: string | null }): string {
  if (!profile) return "";
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  return name || profile.email?.split("@")[0] || "";
}

function getInitials(profile?: { first_name: string | null; last_name: string | null; email: string | null; name?: string | null }): string {
  if (!profile) return "U";
  const f = profile.first_name?.[0] || "";
  const l = profile.last_name?.[0] || "";
  const initials = (f + l).toUpperCase();
  if (initials) return initials;

  if (profile.name) {
    return profile.name.charAt(0).toUpperCase();
  }
  if (profile.email) {
    return profile.email.charAt(0).toUpperCase();
  }
  return "U";
}


function ChatListSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ChatList = ({ onSelectConversation, selectedId, defaultSelectedId, onUnreadChange, userProfilePicture }: ChatListProps) => {
  const { user } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const { conversations, isLoading } = useConversations(showArchived);

  const activeConversations = conversations.filter(c => c.status === "active");
  const archivedConversations = conversations.filter(c => c.status === "archived");
  const displayConversations = showArchived ? archivedConversations : activeConversations;

  // Detect unread messages
  useEffect(() => {
    const hasUnreadMessages = conversations.some(
      (conv) => conv.unread_count && conv.unread_count > 0
    );
    onUnreadChange?.(hasUnreadMessages);
  }, [conversations, onUnreadChange]);

  useEffect(() => {
    if (!defaultSelectedId || selectedId) return;

    const matchingConversation = displayConversations.find(
      (conv) => conv.id === defaultSelectedId
    );

    if (matchingConversation) {
      onSelectConversation(matchingConversation);
    }
  }, [defaultSelectedId, selectedId, displayConversations, onSelectConversation]);

  if (isLoading) {
    return <ChatListSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-book-200 bg-gradient-to-r from-book-50 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-book-900">Messages</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs text-book-600 hover:bg-book-100 hover:text-book-700"
          >
            <Archive className="h-3.5 w-3.5 mr-1" />
            {showArchived ? "Active" : "Archived"}
          </Button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {displayConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="h-10 w-10 text-book-200 mb-3" />
            <p className="text-sm text-book-600">
              {showArchived ? "No archived conversations" : "No conversations yet"}
            </p>
            {!showArchived && (
              <p className="text-xs text-book-500 mt-1">
                Start chatting by clicking "Chat to Seller" on any listing
              </p>
            )}
          </div>
        ) : (
          displayConversations.map((conv) => {
            const otherParty = user?.id === conv.buyer_id ? conv.seller : conv.buyer;
            const otherName = getDisplayName(otherParty);
            const otherHasProfile = Boolean(otherParty && (otherParty.first_name || otherParty.last_name || otherParty.email));
            const listingTitle = conv.listing?.title || "";
            const listingImage = conv.listing?.front_cover || conv.listing?.image_url;
            const lastMsg = conv.last_message;
            const isSelected = selectedId === conv.id;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full flex items-start gap-3 p-4 border-b border-book-100 transition-all duration-200 text-left ${
                  isSelected
                    ? "bg-book-50 border-l-4 border-l-book-600 shadow-sm"
                    : "hover:bg-book-50/50"
                }`}
              >
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="h-12 w-12 border-2 border-book-200 shadow-sm">
                    <AvatarImage src={otherParty?.profile_picture_url || ""} className="object-cover" />
                    <AvatarFallback className="bg-book-100 text-book-700 text-xs font-semibold">
                      {getInitials(otherParty)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    {otherHasProfile ? (
                      <p className="text-sm font-semibold text-book-900 truncate">{otherName}</p>
                    ) : (
                      <Skeleton className="h-4 w-24" />
                    )}
                    {/* Unread indicator badge (WhatsApp style) */}
                    {conv.unread_count !== undefined && conv.unread_count > 0 && (
                      <div className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-green-500 text-white text-[10px] font-bold flex-shrink-0" title={`${conv.unread_count} unread messages`}>
                        {conv.unread_count}
                      </div>
                    )}
                    {lastMsg && (
                      <span className="text-xs text-book-500 flex-shrink-0">
                        {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {listingTitle ? (
                    <p className="text-xs text-book-600 font-medium truncate">{listingTitle}</p>
                  ) : (
                    <Skeleton className="h-3 w-28" />
                  )}
                  {lastMsg && (
                    <p className="text-xs text-book-500 truncate mt-0.5">
                      {lastMsg.sender_id === user?.id ? "You: " : ""}
                      {lastMsg.content || (lastMsg.media_url ? "📎 Media" : "")}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;
