import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMessages } from "@/hooks/useChat";
import { Conversation, reportConversation, checkForPersonalInfo, archiveConversation } from "@/services/chatService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft, Flag, AlertTriangle, Loader2, User, Shield, Check, CheckCheck, Archive, Package, Image, X as XIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
  onArchived?: () => void;
}

function getDisplayName(profile?: { first_name: string | null; last_name: string | null; email: string | null }): string {
  if (!profile) return "Unknown";
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  return name || profile.email?.split("@")[0] || "Unknown";
}

function getInitials(profile?: { first_name: string | null; last_name: string | null }): string {
  if (!profile) return "?";
  const f = profile.first_name?.[0] || "";
  const l = profile.last_name?.[0] || "";
  return (f + l).toUpperCase() || "?";
}

const REPORT_CATEGORIES = [
  { id: "spam", label: "Spam" },
  { id: "inappropriate", label: "Inappropriate Content" },
  { id: "fake_listing", label: "Fake Listing" },
  { id: "offensive", label: "Offensive Language" },
  { id: "other", label: "Other" },
] as const;

type ReportCategory = typeof REPORT_CATEGORIES[number]["id"];

const ChatView = ({ conversation, onBack, onArchived }: ChatViewProps) => {
  const { user } = useAuth();
  const { messages, isLoading, isSending, send } = useChatMessages(conversation.id);
  const [newMessage, setNewMessage] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategory | null>(null);
  const [reportDetail, setReportDetail] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const otherParty = user?.id === conversation.buyer_id ? conversation.seller : conversation.buyer;
  const otherName = getDisplayName(otherParty);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!user?.id || !conversation.id) return;
    const unreadIds = messages
      .filter(m => m.sender_id !== user.id && !m.read_at)
      .map(m => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => {});
  }, [messages, user?.id, conversation.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Check for active order linked to this conversation
  useEffect(() => {
    if (!conversation.listing_id || !conversation.buyer_id || !conversation.seller_id) return;
    
    supabase
      .from("orders")
      .select("id, status, delivery_status, total_amount, created_at")
      .eq("buyer_id", conversation.buyer_id)
      .eq("seller_id", conversation.seller_id)
      .or(`book_id.eq.${conversation.listing_id},item_id.eq.${conversation.listing_id}`)
      .not("status", "in", '("cancelled")')
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setActiveOrder(data);
      });
  }, [conversation.listing_id, conversation.buyer_id, conversation.seller_id]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed && !mediaPreview) return;
    setNewMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const mUrl = mediaPreview?.url;
    const mType = mediaPreview?.type;
    setMediaPreview(null);
    await send(trimmed, mUrl, mType);
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("File must be under 25MB"); return; }
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { toast.error("Only images and videos are supported"); return; }
    setIsUploadingMedia(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `chat-media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("chat-media").getPublicUrl(path);
      setMediaPreview({ url: publicUrl, type: isImage ? "image" : "video" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload media");
    } finally {
      setIsUploadingMedia(false);
      e.target.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReport = async () => {
    if (!reportCategory || !user?.id) return;
    const reasonText = reportCategory === "other"
      ? (reportDetail.trim() || "Other")
      : `${REPORT_CATEGORIES.find(c => c.id === reportCategory)?.label}${reportDetail.trim() ? ": " + reportDetail.trim() : ""}`;

    try {
      setIsReporting(true);
      await reportConversation(conversation.id, user.id, reasonText);
      toast.success("Conversation reported. Our team will review it.");
      setShowReportDialog(false);
      setReportCategory(null);
      setReportDetail("");
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsArchiving(true);
      await archiveConversation(conversation.id);
      toast.success("Conversation archived");
      setShowArchiveDialog(false);
      onArchived?.();
      onBack();
    } catch {
      toast.error("Failed to archive conversation");
    } finally {
      setIsArchiving(false);
    }
  };

  const orderStatusColor = (status: string) => {
    if (["delivered", "completed"].includes(status)) return "bg-green-100 text-green-700 border-green-200";
    if (["cancelled"].includes(status)) return "bg-red-100 text-red-700 border-red-200";
    return "bg-book-100 text-book-700 border-book-200";
  };

  return (
    <div className="flex flex-col h-full bg-book-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-book-200 bg-white flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0 text-book-600 hover:bg-book-100">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div
          className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-70"
          onClick={() => otherParty?.id && navigate(`/seller/${otherParty.id}`)}
        >
          <Avatar className="h-9 w-9 border-2 border-book-200">
              {otherParty?.profile_picture_url && (
              <AvatarImage
                src={otherParty.profile_picture_url}
                alt={otherName}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-book-100 text-book-700 text-xs font-semibold">
              {getInitials(otherParty)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-book-900 truncate">{otherName}</p>
            {conversation.listing && (
              <p className="text-xs text-book-600 truncate">{conversation.listing.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {conversation.status !== "archived" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowArchiveDialog(true)}
              className="text-book-400 hover:text-book-700 hover:bg-book-100 h-8 w-8"
              title="Archive conversation"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowReportDialog(true)}
            className="text-book-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
            title="Report conversation"
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Listing context */}
      {conversation.listing && (
        <div className="px-4 py-3 bg-book-50 border-b border-book-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-book-200 shadow-sm">
            <img
              src={conversation.listing.front_cover || conversation.listing.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-book-800 truncate">{conversation.listing.title}</p>
            <p className="text-sm text-book-700 font-bold">R{conversation.listing.price}</p>
          </div>
        </div>
      )}

      {/* Active Order Banner */}
      {activeOrder && (
        <div className="px-4 py-2 bg-white border-b border-book-200">
          <div className="flex items-center gap-2 p-2.5 bg-book-50 rounded-lg border border-book-200">
            <Package className="h-4 w-4 text-book-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-book-800">Ongoing Order</p>
              <p className="text-[10px] text-book-600">Order #{activeOrder.id.slice(-8)}</p>
            </div>
            <Badge className={`text-[10px] capitalize border ${orderStatusColor(activeOrder.status)}`}>
              {activeOrder.status.replace(/_/g, " ")}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-book-600 hover:text-book-800 px-2"
              onClick={() => navigate("/profile?tab=activity")}
            >
              View
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Safety Banner */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <Shield className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Safety First</span>
          </div>
          <p className="text-[11px] text-amber-600 leading-relaxed">
            Keep conversations on ReBooked Solutions. Never share bank details ,phone numbers or OTPs.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <Skeleton className={`h-10 ${i % 2 === 0 ? "w-[40%]" : "w-[55%]"} rounded-2xl`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-book-400">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%]`}>
                  {msg.is_flagged && (
                    <div className="flex items-center gap-1 mb-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-[10px]">May contain personal info</span>
                    </div>
                  )}
                  <div
                    className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                      isOwn
                        ? "bg-book-600 text-white rounded-2xl rounded-br-sm shadow-sm"
                        : "bg-white text-book-900 border border-book-200 rounded-2xl rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.media_url && msg.media_type === "image" && (
                      <img src={msg.media_url} alt="Shared" className="rounded-lg mb-2 max-w-full" />
                    )}
                    {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  </div>
                  <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? "justify-end" : ""}`}>
                    <span className="text-[10px] text-book-400">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                    {isOwn && (
                      <span className="text-[10px]">
                        {msg.read_at ? (
                          <CheckCheck className="h-3 w-3 text-book-500 inline" />
                        ) : (
                          <Check className="h-3 w-3 text-book-400 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      {conversation.status !== "archived" ? (
        <div className="border-t border-book-200 bg-white px-3 py-3">
          {checkForPersonalInfo(newMessage) && (
            <div className="flex items-center gap-1.5 text-amber-600 mb-2 px-1">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs">Your message may contain personal information.</span>
            </div>
          )}
          {/* Media preview */}
          {mediaPreview && (
            <div className="relative inline-block mb-2 ml-1">
              {mediaPreview.type === "image" ? (
                <img src={mediaPreview.url} alt="Media" className="h-20 w-20 rounded-lg object-cover border border-book-200" />
              ) : (
                <video src={mediaPreview.url} className="h-20 w-20 rounded-lg object-cover border border-book-200" />
              )}
              <button
                onClick={() => setMediaPreview(null)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center hover:bg-red-600"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            {/* Hidden file input for media */}
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => mediaInputRef.current?.click()}
              disabled={isSending || isUploadingMedia}
              className="h-10 w-10 rounded-xl shrink-0 text-book-400 hover:text-book-700 hover:bg-book-100"
              title="Attach photo or video"
            >
              {isUploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
            </Button>
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              disabled={isSending}
              className="flex-1 resize-none rounded-xl border border-book-200 bg-book-50 px-4 py-2.5 text-sm text-book-900 focus:outline-none focus:ring-2 focus:ring-book-500 focus:border-transparent placeholder:text-book-400 disabled:opacity-50"
              style={{ minHeight: "40px", maxHeight: "120px" }}
            />
            <Button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !mediaPreview) || isSending || isUploadingMedia}
              size="icon"
              className="bg-book-600 hover:bg-book-700 h-10 w-10 rounded-xl shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-book-200 bg-book-50 text-center">
          <p className="text-xs text-book-600">This conversation has been archived</p>
        </div>
      )}

      {/* Report Dialog — with preset categories */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-red-500" />
              Report Conversation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">Select the reason for reporting:</p>
            <div className="grid grid-cols-1 gap-2">
              {REPORT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setReportCategory(cat.id)}
                  className={`text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    reportCategory === cat.id
                      ? "bg-red-50 border-red-400 text-red-700"
                      : "border-gray-200 text-gray-700 hover:border-red-200 hover:bg-red-50/50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {reportCategory && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">
                  {reportCategory === "other" ? "Describe the issue (required):" : "Additional details (optional):"}
                </p>
                <Textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder={reportCategory === "other" ? "Please describe the issue..." : "Any additional context..."}
                  rows={3}
                  className="rounded-xl text-sm"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowReportDialog(false); setReportCategory(null); setReportDetail(""); }} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleReport}
              disabled={!reportCategory || (reportCategory === "other" && !reportDetail.trim()) || isReporting}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {isReporting ? "Reporting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-book-600" />
              Archive Conversation
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Archive this conversation? You can still view it in your archived chats.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-book-600 hover:bg-book-700 rounded-xl"
            >
              {isArchiving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Archiving...</> : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatView;
