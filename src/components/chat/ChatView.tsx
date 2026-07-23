import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMessages } from "@/hooks/useChat";
import { Conversation, reportConversation, checkForPersonalInfo, archiveConversation, getSignedMediaUrl } from "@/services/chatService";
import { compressImage } from "@/utils/imageCompression";
import { supabase } from "@/integrations/supabase/client";
import EnhancedOrderCommitButton from "@/components/orders/EnhancedOrderCommitButton";
import { declineBookSale } from "@/services/commitService";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchSuggestions, fetchAddressDetails, type Suggestion } from "@/services/addressAutocompleteService";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft, Flag, AlertTriangle, Loader2, User, Shield, Check, CheckCheck, CheckCircle, Archive, Package, Image, X as XIcon, ChevronDown, ChevronUp, Video, MapPin, Store } from "lucide-react";
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

// Renders chat media via short-lived signed URLs (private bucket)
const MediaMessage = ({ path, type, onClick, onLoad }: { path: string; type: string; onClick?: () => void; onLoad?: () => void }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSignedMediaUrl(path).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return <div className="h-32 w-48 bg-book-100 rounded-lg animate-pulse" />;
  const content = type === "video" ? (
    <video src={url} controls className="rounded-lg w-full max-w-xs max-h-48 object-contain bg-black" onLoadedData={onLoad} />
  ) : (
    <img src={url} alt="Shared" className="rounded-lg w-full max-w-xs max-h-48 object-cover" onLoad={onLoad} />
  );
  return onClick ? (
    <button onClick={onClick} className="cursor-pointer w-full max-w-xs block overflow-hidden rounded-lg">
      {content}
    </button>
  ) : content;
};

// Fix Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LeafletMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, address: string) => void;
}

const LeafletMapPicker: React.FC<LeafletMapPickerProps> = ({ isOpen, onClose, onSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: -33.9249, lng: 18.4241 }); // default Cape Town
  const [addressName, setAddressName] = useState("Cape Town");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(searchQuery);
        setSuggestions(results || []);
        setShowSuggestions((results || []).length > 0);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setSearchQuery(suggestion.description);
    setShowSuggestions(false);
    setIsSearching(true);
    try {
      const details = await fetchAddressDetails(suggestion.place_id);
      if (details) {
        setCoords({ lat: details.lat, lng: details.lng });
        setAddressName(details.formatted_address || suggestion.description);
        if (leafletMap.current) {
          leafletMap.current.setView([details.lat, details.lng], 15);
          markerRef.current?.setLatLng([details.lat, details.lng]);
        }
      }
    } catch (err) {
      toast.error("Failed to fetch address details");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      if (!leafletMap.current) {
        leafletMap.current = L.map(mapRef.current).setView([coords.lat, coords.lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leafletMap.current);

        markerRef.current = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(leafletMap.current);

        leafletMap.current.on("click", async (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setCoords({ lat, lng });
          markerRef.current?.setLatLng([lat, lng]);
          leafletMap.current?.setView([lat, lng]);
          
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data?.display_name) {
              setAddressName(data.display_name);
            }
          } catch (err) {
            console.error("Reverse geocoding failed:", err);
          }
        });

        markerRef.current.on("dragend", async () => {
          if (!markerRef.current) return;
          const pos = markerRef.current.getLatLng();
          setCoords({ lat: pos.lat, lng: pos.lng });
          leafletMap.current?.setView([pos.lat, pos.lng]);

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}`);
            const data = await res.json();
            if (data?.display_name) {
              setAddressName(data.display_name);
            }
          } catch (err) {
            console.error("Reverse geocoding failed:", err);
          }
        });
      } else {
        leafletMap.current.invalidateSize();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        setCoords({ lat, lng });
        setAddressName(first.display_name);
        
        if (leafletMap.current) {
          leafletMap.current.setView([lat, lng], 15);
          markerRef.current?.setLatLng([lat, lng]);
        }
      } else {
        toast.error("Location not found");
      }
    } catch (err) {
      toast.error("Failed to search location");
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[90vw] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-book-900">
            <MapPin className="h-5 w-5 text-blue-600" />
            Choose Meetup Location
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative z-50">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search address (e.g. Cape Town Mall)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-xl border border-book-200 bg-book-50 px-3 py-1.5 text-xs text-book-900 focus:outline-none focus:ring-2 focus:ring-book-500"
              />
              <Button type="submit" disabled={isSearching} className="bg-blue-600 hover:bg-blue-700 h-8 px-3 rounded-xl text-xs">
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-book-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-[9999] py-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-book-50 transition-colors text-book-800 font-medium"
                  >
                    {suggestion.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={mapRef} className="h-60 w-full rounded-xl border border-book-200 overflow-hidden relative z-0" />

          <div className="bg-book-50 p-3 rounded-xl text-xs space-y-1">
            <p className="font-semibold text-book-900">Selected Location Details:</p>
            <p className="text-book-700 line-clamp-2">{addressName}</p>
            <p className="text-[10px] text-book-500">Coordinates: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={() => onSelect(coords.lat, coords.lng, addressName)}
            className="bg-book-600 hover:bg-book-700 rounded-xl"
          >
            Send Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface LeafletMiniMapProps {
  lat: number;
  lng: number;
  label?: string;
}

const LeafletMiniMap: React.FC<LeafletMiniMapProps> = ({ lat, lng, label }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      
      leafletMap.current = L.map(containerRef.current, {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
      }).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: ""
      }).addTo(leafletMap.current);

      L.marker([lat, lng]).addTo(leafletMap.current);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div ref={containerRef} className="h-32 w-full rounded-lg border border-book-200 overflow-hidden mt-1 pointer-events-none relative z-0 bg-book-100" />
  );
};

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
  onArchived?: () => void;
  onMessagesRead?: () => void;
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

const REPORT_CATEGORIES = [
  { id: "spam", label: "Spam" },
  { id: "inappropriate", label: "Inappropriate Content" },
  { id: "fake_listing", label: "Fake Listing" },
  { id: "offensive", label: "Offensive Language" },
  { id: "other", label: "Other" },
] as const;

type ReportCategory = typeof REPORT_CATEGORIES[number]["id"];

const ChatViewContent = ({ conversation, onBack, onArchived, onMessagesRead, selectedMedia, setSelectedMedia }: ChatViewProps & { selectedMedia: { path: string; type: string } | null; setSelectedMedia: (media: { path: string; type: string } | null) => void }) => {
  const { user, profile } = useAuth();
  const { messages, isLoading, send } = useChatMessages(conversation.id);
  const [messageListings, setMessageListings] = useState<Record<string, any>>({});
  const [newMessage, setNewMessage] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategory | null>(null);
  const [reportDetail, setReportDetail] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDecliningOrder, setIsDecliningOrder] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string; previewUrl?: string } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const otherParty = user?.id === conversation.buyer_id ? conversation.seller : conversation.buyer;
  const otherName = getDisplayName(otherParty);
  const otherHasProfile = Boolean(otherParty && (otherParty.first_name || otherParty.last_name || otherParty.email));


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
      .then(() => {
        onMessagesRead?.();
      });
  }, [messages, user?.id, conversation.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Detect listing references inside message content and fetch inline card data
  // Skip system messages with reference_card since they render separately
  useEffect(() => {
    let mounted = true;
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const fetchForMessage = async (msgId: string, uuid: string) => {
      try {
        const { resolveListing } = await import("@/services/chatService");
        const item = await resolveListing(uuid, conversation.item_type);
        if (!mounted) return;
        if (item) {
          setMessageListings(prev => ({ ...prev, [msgId]: { status: 'ready', item } }));
        } else {
          setMessageListings(prev => ({ ...prev, [msgId]: { status: 'not_found' } }));
        }
      } catch (err) {
        if (!mounted) return;
        setMessageListings(prev => ({ ...prev, [msgId]: { status: 'error' } }));
      }
    };

    messages.forEach((m) => {
      // Skip system messages with reference_card to avoid duplicate rendering
      if (m.is_system && m.reference_card) return;
      if (!m.content) return;
      const match = m.content.match(uuidRegex);
      if (match && !messageListings[m.id]) {
        setMessageListings(prev => ({ ...prev, [m.id]: { status: 'loading' } }));
        fetchForMessage(m.id, match[0]);
      }
    });

    return () => { mounted = false; };
  }, [messages]);

  // Check for active orders linked to this conversation.
  // STRICT: only show orders where buyer/seller pair AND listing_id match this conversation.
  // If the conversation has no listing_id, do not show any orders (avoids cross-conversation leakage).
  const [orderItemImages, setOrderItemImages] = useState<Record<string, string>>({});

  const [pastCompletedOrders, setPastCompletedOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!conversation.buyer_id || !conversation.seller_id) {
      setActiveOrders([]);
      setPastCompletedOrders([]);
      return;
    }

    // Query all orders between buyer and seller
    supabase
      .from("orders")
      .select("id, status, order_type, pickup_status, delivery_status, delivery_type, delivery_option, meetup_location, meetup_time, total_amount, created_at, book_id, item_id, item_type, items, dispute_reason, dispute_status, dispute_timer_expires_at, dispute_resolution, dispute_escalated")
      .eq("buyer_id", conversation.buyer_id)
      .eq("seller_id", conversation.seller_id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        if (data && data.length > 0) {
          // Filter ongoing active orders (excluding cancelled/completed/delivered)
          const active = data.filter((o: any) => !["completed", "delivered", "cancelled"].includes(o.status));
          const completed = data.filter((o: any) => ["completed", "delivered"].includes(o.status));
          
          setActiveOrders(active);
          setPastCompletedOrders(completed);
          if (active.length > 0) {
            setExpandedOrders(new Set([active[0].id]));
          }

          // Fetch image for each order based on item_type
          const imageMap: Record<string, string> = {};
          await Promise.all(
            data.map(async (order: any) => {
              const itemId = order.book_id || order.item_id;
              if (!itemId) return;
              const itemType = (order.item_type || "book").toLowerCase();
              const tableMap: Record<string, string> = {
                book: "books",
                textbook: "books",
                uniform: "uniforms",
                school_supply: "school_supplies",
              };
              const table = tableMap[itemType] || "books";
              try {
                const cols = table === "books"
                  ? "front_cover, image_url"
                  : "image_url";
                const { data: itemRow } = await supabase
                  .from(table)
                  .select(cols)
                  .eq("id", itemId)
                  .maybeSingle();
                const img =
                  (itemRow as any)?.front_cover ||
                  (itemRow as any)?.image_url ||
                  "";
                if (img) imageMap[order.id] = img;
              } catch {
                /* noop */
              }
            })
          );
          setOrderItemImages(imageMap);
        } else {
          setActiveOrders([]);
          setPastCompletedOrders([]);
        }
      });
  }, [conversation.listing_id, conversation.buyer_id, conversation.seller_id]);

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Auto-resize textarea via useEffect to ensure it updates when newMessage is cleared/changed
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [newMessage]);

  // Prevent window scroll when typing/focusing on `/chats` page (prevents iOS layout shifts)
  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/chats") return;

    const handleScroll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSend = async () => {
    if (isUploadingMedia) return;
    const trimmed = newMessage.trim();
    if (!trimmed && !mediaPreview) return;
    // Save text before clearing — will restore on send failure
    const savedText = newMessage;
    setNewMessage("");
    const mUrl = mediaPreview?.url;
    const mType = mediaPreview?.type;
    setMediaPreview(null);
    const result = await send(trimmed, mUrl, mType);
    if (!result.success && result.content) {
      // Restore message text to input so user can retry
      setNewMessage(result.content);
      toast.error("Failed to send message. Your text has been restored.");
    }
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { toast.error("Only images and videos are supported"); return; }
    setIsUploadingMedia(true);
    try {
      let uploadBlob: Blob = file;
      let ext = file.name.split(".").pop() || "bin";
      let contentType = file.type;
      // Compress images before upload (videos uploaded as-is)
      if (isImage) {
        const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.75, format: "image/webp" });
        uploadBlob = compressed.blob;
        ext = compressed.extension;
        contentType = compressed.mimeType;
      }
      // Path MUST start with conversation_id (RLS enforces this)
      const path = `${conversation.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-media").upload(path, uploadBlob, { upsert: false, contentType });
      if (upErr) throw upErr;
      const signedPreview = await getSignedMediaUrl(path);
      // Store path in url field (used as DB value); preview URL kept separately for thumbnail
      setMediaPreview({ url: path, type: isImage ? "image" : "video", previewUrl: signedPreview } as any);
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

  const handleBack = async () => {
    if (user?.id && conversation.id) {
      try {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", conversation.id)
          .neq("sender_id", user.id)
          .is("read_at", null);
        // Notify parent that messages have been read so unread indicators update
        onMessagesRead?.();
      } catch (e) {
        console.error("Failed to mark messages read on back:", e);
      }
    }
    onBack();
  };

  const orderStatusColor = (status: string) => {
    if (["delivered", "completed"].includes(status)) return "bg-green-100 text-green-700 border-green-200";
    if (["cancelled"].includes(status)) return "bg-red-100 text-red-700 border-red-200";
    return "bg-book-100 text-book-700 border-book-200";
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-book-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-book-200 bg-white flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 shrink-0 text-book-600 hover:bg-book-100">
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
            {otherHasProfile ? (
              <p className="text-sm font-semibold text-book-900 truncate">{otherName}</p>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
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

      {/* Active Orders Banner */}
      {activeOrders.length > 0 && (
        <div className="px-4 py-2 bg-white border-b border-book-200 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-book-600" />
            <span className="text-xs font-semibold text-book-800">
              {activeOrders.length === 1 ? "Ongoing Order" : `${activeOrders.length} Ongoing Orders`}
            </span>
          </div>
          {activeOrders.map((order) => {
            const itemImg =
              orderItemImages[order.id] ||
              (conversation.listing as any)?.image_url ||
              (conversation.listing as any)?.front_cover ||
              (Array.isArray(order.items) && (order.items[0]?.image_url || order.items[0]?.front_cover)) ||
              "/placeholder.svg";
            const itemTitle =
              (conversation.listing as any)?.title ||
              (Array.isArray(order.items) && (order.items[0]?.title || order.items[0]?.name)) ||
              "Item";
            return (
              <div key={order.id} className="bg-book-50 rounded-lg border border-book-200 overflow-hidden">
                <button
                  onClick={() => toggleOrderExpanded(order.id)}
                  className="w-full px-2.5 py-2 flex items-center gap-2 hover:bg-book-100 transition-colors"
                >
                  {expandedOrders.has(order.id) ? (
                    <ChevronUp className="h-4 w-4 text-book-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-book-600 flex-shrink-0" />
                  )}
                  <img
                    src={itemImg}
                    alt={itemTitle}
                    className="w-9 h-9 rounded-md object-cover bg-book-100 flex-shrink-0 border border-book-200"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-book-900 truncate">{itemTitle}</p>
                    <p className="text-[10px] text-book-600">Order #{order.id.slice(-8)}</p>
                  </div>
                  <Badge className={`text-[10px] capitalize border ${orderStatusColor(order.status)} flex-shrink-0`}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </button>

                {/* Horizontal Progress Timeline */}
                {!["cancelled"].includes(order.status) && (() => {
                  let activeIdx = 0; // Paid
                  const status = order.status;
                  if (["committed", "awaiting_pickup", "pickup_scheduled", "ready_for_pickup"].includes(status)) {
                    activeIdx = 1; // Committed
                  } else if (
                    ["dispatched", "in_transit", "handed_over", "awaiting_buyer_confirmation", "disputed", "escalated"].includes(status)
                  ) {
                    activeIdx = 2; // Shipped / In Transit
                  } else if (["delivered", "completed"].includes(status)) {
                    activeIdx = 3; // Delivered
                  }

                  const steps = [
                    { label: "Paid", desc: "Awaiting accept" },
                    { label: "Committed", desc: order.order_type === "pickup" ? "Meetup set" : "Ready" },
                    { label: "Shipped", desc: order.order_type === "pickup" ? "Meetup" : "In transit" },
                    { label: "Delivered", desc: "Delivered" }
                  ];

                  return (
                    <div className="bg-gray-50/50 px-3 py-2.5 border-t border-book-100 flex items-center justify-between gap-1 shrink-0">
                      {steps.map((step, idx) => {
                        const isCompleted = idx < activeIdx;
                        const isCurrent = idx === activeIdx;

                        return (
                          <React.Fragment key={idx}>
                            {idx > 0 && (
                              <div
                                className={`flex-1 h-0.5 min-w-[12px] ${
                                  idx <= activeIdx ? "bg-book-600" : "bg-gray-200"
                                }`}
                              />
                            )}
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${
                                  isCompleted
                                    ? "bg-book-600 text-white"
                                    : isCurrent
                                    ? "bg-book-50 border border-book-600 text-book-700 font-bold"
                                    : "bg-gray-100 text-gray-400 border border-gray-200"
                                }`}
                              >
                                {isCompleted ? "✓" : idx + 1}
                              </div>
                              <span className={`text-[8px] font-bold mt-0.5 ${isCurrent ? "text-book-700" : "text-gray-500"}`}>
                                {step.label}
                              </span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Dispute Warning Banner inside Order Card context */}
                {(order.status === "disputed" || order.status === "escalated" || order.dispute_status === "resolved") && (
                  <div className={`p-3 border-t text-left space-y-1 ${order.dispute_status === "resolved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    <div className={`flex items-center gap-1.5 font-bold text-[10px] ${order.dispute_status === "resolved" ? "text-emerald-950" : "text-red-950"}`}>
                      {order.dispute_status === "resolved" ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          Dispute Resolved
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-red-650 shrink-0" />
                          Active Dispute {order.dispute_escalated && "— Escalated to Support"}
                        </>
                      )}
                    </div>
                    <p className={`text-[9px] leading-relaxed ${order.dispute_status === "resolved" ? "text-emerald-700" : "text-red-700"}`}>
                      {order.dispute_status === "resolved" ? (
                        <>Resolution: "{order.dispute_resolution || "Escrow released"}"</>
                      ) : (
                        <>Reason: "{order.dispute_reason || "Not specified"}"</>
                      )}
                    </p>
                    {order.dispute_status !== "resolved" && order.dispute_timer_expires_at && (
                      <p className="text-[8.5px] text-red-650 font-semibold">
                        SLA Deadline: {new Date(order.dispute_timer_expires_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                {expandedOrders.has(order.id) && (
                  <div className="px-2.5 py-2 border-t border-book-200 bg-white text-[10px]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-book-600">Status:</span>
                        <p className="font-semibold text-book-800">{order.status.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <span className="text-book-600">Amount:</span>
                        <p className="font-semibold text-book-800">R{(order.total_amount || 0).toFixed(2)}</p>
                      </div>
                      {order.delivery_status && (
                        <div className="col-span-2">
                          <span className="text-book-600">Delivery:</span>
                          <p className="font-semibold text-book-800">{order.delivery_status.replace(/_/g, " ")}</p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-[10px] text-book-600 hover:text-book-800 px-2 mt-2"
                      onClick={() => navigate(`/profile?tab=activity&order=${order.id}`)}
                    >
                      View Details
                    </Button>
                    {(order.status === "pending" || order.status === "pending_commit") ? (
                      <div className="mt-3 pt-3 border-t border-book-100 space-y-2">
                        {user?.id === conversation.seller_id ? (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex flex-col gap-2">
                            <span className="font-semibold text-xs flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              Pending Sale Commit
                            </span>
                            <span className="text-[10px] text-amber-800 leading-normal">
                              {order.order_type === "pickup"
                                ? "This is a meetup/pickup order. You need to commit to the sale before arranging a meetup."
                                : "Please commit to the sale to schedule courier pickup."}
                            </span>
                            <div className="flex gap-2 mt-1">
                              <EnhancedOrderCommitButton
                                orderId={order.id}
                                sellerId={user.id}
                                bookTitle={itemTitle}
                                buyerName={otherName}
                                orderStatus={order.status}
                                className="h-7 text-[10px] py-1 bg-emerald-600 hover:bg-emerald-700 flex-1 justify-center"
                                onCommitSuccess={() => window.location.reload()}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isDecliningOrder}
                                onClick={async () => {
                                  if (!confirm("Decline this order? The buyer will be fully refunded.")) return;
                                  try {
                                    setIsDecliningOrder(true);
                                    await declineBookSale(order.id);
                                    toast.success("Order declined successfully.");
                                    window.location.reload();
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to decline order");
                                  } finally {
                                    setIsDecliningOrder(false);
                                  }
                                }}
                                className="h-7 text-[10px] py-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 flex-1 justify-center"
                              >
                                {isDecliningOrder ? "Declining..." : "Decline"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-900 flex flex-col gap-1">
                            <span className="font-semibold text-xs">Waiting for Seller Confirmation</span>
                            <span className="text-[10px] text-blue-700 leading-normal">The seller needs to confirm the sale before the order can proceed.</span>
                          </div>
                        )}
                      </div>
                    ) : (order.order_type === "pickup" || order.delivery_option === "pickup") && (
                      <div className="mt-3 pt-3 border-t border-book-100 space-y-2">
                        {order.status === "awaiting_confirmation" || order.status === "committed" || order.status === "pending_delivery" || order.status === "in_transit" ? (
                          <div className="p-2 bg-blue-50 border border-blue-100 rounded text-blue-800 flex flex-col gap-1">
                            <span className="font-semibold">7-Day Meetup Window</span>
                            <span>Arrange meetup within 7 days. Confirm delivery on the order details page.</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
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

        {/* Past Completed Orders Banner */}
        {pastCompletedOrders.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-xs font-semibold text-green-800">
                You have {pastCompletedOrders.length} completed {pastCompletedOrders.length === 1 ? "transaction" : "transactions"} together
              </span>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate("/profile?tab=activity")}
              className="text-xs text-green-700 hover:text-green-950 font-bold p-0 h-auto"
            >
              View Order History
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <Skeleton className={`h-10 ${i % 2 === 0 ? "w-[40%]" : "w-[55%]"} rounded-2xl`} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-book-400">No messages yet. Say hello! 👋</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isReferenceCard = msg.message_type === "system" && msg.reference_card;
                if (isReferenceCard) {
                  const card = msg.reference_card as {
                    listing_id: string;
                    title: string;
                    description: string;
                    price: number;
                    thumbnail_url: string;
                    listing_url: string;
                  };

                  return (
                    <div key={msg.id} className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => navigate(card.listing_url)}
                        className="w-full max-w-[78%] text-left rounded-2xl border border-book-200 bg-book-50 p-3 shadow-sm hover:border-book-300 hover:bg-book-100 transition"
                        aria-label={`View listing ${card.title}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-book-100 flex-shrink-0 border border-book-200">
                            <img src={card.thumbnail_url} alt={card.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-book-900 truncate">{card.title}</p>
                            <p className="text-xs text-book-600 mt-1 line-clamp-2" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {card.description}
                            </p>
                          </div>
                          <div className="text-sm font-bold text-book-700">R{card.price}</div>
                        </div>
                        <div className="mt-3 text-[10px] uppercase tracking-[0.15em] text-book-500">
                          Listing reference
                        </div>
                      </button>
                    </div>
                  );
                }

                const isOwn = msg.sender_id === user?.id;
                const renderMeetupCard = (address: string, lat?: number, lng?: number) => {
                  const isValid = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
                  return (
                    <div className="space-y-2 p-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <MapPin className={`h-4 w-4 ${isOwn ? "text-white" : "text-blue-600"}`} />
                        <span className={isOwn ? "text-white" : "text-blue-600"}>Proposed Meetup Location</span>
                      </div>
                      <p className={`text-xs font-medium leading-normal ${isOwn ? "text-teal-50" : "text-gray-800"}`}>{address}</p>
                      
                      {isValid && (
                        <LeafletMiniMap lat={lat} lng={lng} label={address} />
                      )}

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${isValid ? `${lat},${lng}` : encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold w-full text-center transition-colors mt-2 ${
                          isOwn 
                            ? "bg-white text-book-700 hover:bg-teal-50" 
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                      >
                        <span>Open in Google Maps</span>
                      </a>
                      <div className={`p-2 border rounded-lg text-[10px] flex items-start gap-1 ${
                        isOwn 
                          ? "bg-white/10 border-white/20 text-white" 
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}>
                        <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isOwn ? "text-white" : "text-amber-600"}`} />
                        <span>Meet in a public, well-lit space (e.g. shopping mall or police station). Never go alone.</span>
                      </div>
                    </div>
                  );
                };

                const userAvatarUrl = profile?.profile_picture_url || (user?.user_metadata as any)?.avatar_url || "";
                return (
                  <div key={msg.id} className={`flex items-start gap-2.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                    {!isOwn && (
                      <Avatar className="h-8 w-8 border border-book-200 shrink-0 mt-0.5 shadow-sm">
                        {otherParty?.profile_picture_url && (
                          <AvatarImage
                            src={otherParty.profile_picture_url}
                            alt={otherName}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-book-100 text-book-700 text-[10px] font-bold">
                          {getInitials(otherParty)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[70%] md:max-w-[78%]`}>
                      <div
                        className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                          isOwn
                            ? "bg-book-600 text-white rounded-2xl rounded-br-sm shadow-sm"
                            : "bg-white text-book-900 border border-book-200 rounded-2xl rounded-bl-sm shadow-sm"
                        }`}
                      >
                        {msg.is_flagged && (
                          <div className={`flex items-center gap-1 mb-2 ${isOwn ? "text-red-200" : "text-red-600"}`}>
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-[10px] font-semibold">May contain personal info</span>
                          </div>
                        )}
                        {msg.media_url && (msg.media_type === "image" || msg.media_type === "video") && (
                          <div className="mb-2">
                            <MediaMessage
                              path={msg.media_url}
                              type={msg.media_type}
                              onClick={() => setSelectedMedia({ path: msg.media_url, type: msg.media_type })}
                              onLoad={() => {
                                if (scrollContainerRef.current) {
                                  scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                                }
                              }}
                            />
                          </div>
                        )}
                        {msg.content && msg.content.startsWith("Meetup Coordinates:") ? (() => {
                          const payload = msg.content.replace("Meetup Coordinates:", "").trim();
                          const parts = payload.split("|");
                          const latLngStr = parts[0]?.trim() || "";
                          const address = parts[1]?.trim() || "Proposed Meetup Location";
                          const [latStr, lngStr] = latLngStr.split(",");
                          const lat = parseFloat(latStr);
                          const lng = parseFloat(lngStr);

                          return renderMeetupCard(address, lat, lng);
                        })() : msg.content && msg.content.startsWith("Meetup Location:") ? (
                          renderMeetupCard(msg.content.replace("Meetup Location:", "").trim())
                        ) : msg.content && msg.content.startsWith("Proposed Meetup Location:") ? (
                          renderMeetupCard(msg.content.replace("Proposed Meetup Location:", "").trim())
                        ) : msg.content && (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        {messageListings[msg.id] && (
                          messageListings[msg.id].status === 'loading' ? (
                            <div className="mt-2 p-3 rounded-lg bg-book-50 border border-book-200 animate-pulse mx-auto">
                              <div className="h-16 w-full bg-gray-200 rounded" />
                            </div>
                          ) : messageListings[msg.id].status === 'ready' && messageListings[msg.id].item ? (
                            <div className="mt-2 p-3 rounded-lg bg-white border border-book-200 flex items-start gap-3 mx-auto">
                              <div className="w-14 h-14 rounded overflow-hidden bg-book-100 flex-shrink-0">
                                <img src={messageListings[msg.id].item.imageUrl || messageListings[msg.id].item.frontCover || messageListings[msg.id].item.image_url} alt={messageListings[msg.id].item.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-book-900 truncate">{messageListings[msg.id].item.title}</p>
                                <p className="text-xs text-book-600 mt-1 line-clamp-2" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{messageListings[msg.id].item.description}</p>
                              </div>
                              <div className="text-sm font-bold text-book-700">R{messageListings[msg.id].item.price}</div>
                            </div>
                          ) : null
                        )}
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
                    {isOwn && (
                      <Avatar className="h-8 w-8 border border-book-200 shrink-0 mt-0.5 shadow-sm">
                        {userAvatarUrl && (
                          <AvatarImage
                            src={userAvatarUrl}
                            alt="You"
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-book-100 text-book-700 text-[10px] font-bold">
                          {(profile?.name || user?.email || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Input Area */}
      {conversation.status !== "archived" ? (
        <div className="border-t border-book-200 bg-white px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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
                <img src={mediaPreview.previewUrl || mediaPreview.url} alt="Media" className="h-20 w-20 rounded-lg object-cover border border-book-200" />
              ) : (
                <video src={mediaPreview.previewUrl || mediaPreview.url} className="h-20 w-20 rounded-lg object-cover border border-book-200" />
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
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => mediaInputRef.current?.click()}
              disabled={isUploadingMedia}
              className="h-10 w-10 rounded-xl shrink-0 text-book-400 hover:text-book-700 hover:bg-book-100"
              title="Attach photo or video"
            >
              {isUploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowMapPicker(true)}
              className="h-10 w-10 rounded-xl shrink-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
              title="Send Meetup Location Map"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                try {
                  // Fetch saved address or locker from profile & user_addresses
                  const [{ data: prof }, { data: addrRow }] = await Promise.all([
                    supabase.from("profiles").select("pickup_address_encrypted, preferred_pickup_locker_data, preferred_delivery_locker_data").eq("id", user.id).maybeSingle(),
                    supabase.from("user_addresses" as any).select("pickup_address").eq("user_id", user.id).maybeSingle()
                  ]);
                  
                  let formattedAddr = "";

                  // Check preferred locker
                  const locker = (prof as any)?.preferred_pickup_locker_data || (prof as any)?.preferred_delivery_locker_data;
                  if (locker && locker.name) {
                    formattedAddr = `Locker: ${locker.name} (${locker.full_address || locker.address || ""})`;
                  } else if (addrRow?.pickup_address?.street_address || addrRow?.pickup_address?.street) {
                    const a = addrRow.pickup_address;
                    formattedAddr = `${a.street_address || a.street}, ${a.suburb || a.city || ""}, ${a.province || ""}`;
                  } else if (prof?.pickup_address_encrypted) {
                    formattedAddr = prof.pickup_address_encrypted;
                  }

                  if (formattedAddr) {
                    await send(`📍 My Saved Pickup Address:\n${formattedAddr}`);
                    toast.success("Pickup address shared in chat!");
                  } else {
                    toast.error("No saved pickup address found. Please configure your address in Profile Settings first.");
                  }
                } catch (e) {
                  toast.error("Failed to share saved pickup address");
                }
              }}
              className="h-10 w-10 rounded-xl shrink-0 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
              title="Quick-share your saved pickup address"
            >
              <Store className="h-4 w-4" />
            </Button>
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-book-200 bg-book-50 px-4 py-2.5 text-sm text-book-900 focus:outline-none focus:ring-2 focus:ring-book-500 focus:border-transparent placeholder:text-book-400"
              style={{ minHeight: "40px", maxHeight: "120px" }}
            />
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSend}
              disabled={(!newMessage.trim() && !mediaPreview) || isUploadingMedia}
              size="icon"
              className="bg-book-600 hover:bg-book-700 h-10 w-10 rounded-xl shrink-0"
            >
              <Send className="h-4 w-4" />
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

      {/* Map Picker Dialog */}
      <LeafletMapPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelect={async (lat, lng, address) => {
          setShowMapPicker(false);
          try {
            await send(`Meetup Coordinates: ${lat},${lng} | ${address}`);
            toast.success("Meetup coordinates sent!");
          } catch {
            toast.error("Failed to send meetup location");
          }
        }}
      />
    </div>
  );
};

// Media Lightbox Dialog - Render as absolute portal/overlay to prevent dialog/input glitching
const MediaDialog = ({ selectedMedia, onClose }: { selectedMedia: { path: string; type: string } | null; onClose: () => void }) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  useEffect(() => {
    if (selectedMedia) {
      getSignedMediaUrl(selectedMedia.path).then(setMediaUrl);
    } else {
      setMediaUrl(null);
    }
  }, [selectedMedia]);

  if (!selectedMedia) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {mediaUrl ? (
          selectedMedia.type === "video" ? (
            <video src={mediaUrl} controls className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" autoPlay />
          ) : (
            <img src={mediaUrl} alt="Media" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          )
        ) : (
          <div className="w-16 h-16 border-4 border-book-200 border-t-book-600 rounded-full animate-spin" />
        )}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
          aria-label="Close preview"
        >
          <XIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

const ChatView = (props: ChatViewProps) => {
  const [selectedMedia, setSelectedMedia] = useState<{ path: string; type: string } | null>(null);

  return (
    <div className="relative h-full flex flex-col min-h-0 overflow-hidden">
      <ChatViewContent {...props} selectedMedia={selectedMedia} setSelectedMedia={setSelectedMedia} />
      <MediaDialog selectedMedia={selectedMedia} onClose={() => setSelectedMedia(null)} />
    </div>
  );
};

export default ChatView;



