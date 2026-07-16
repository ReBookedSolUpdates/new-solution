import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { checkLiveSubscription } from "@/services/subscriptionService";
import { supabase } from "@/integrations/supabase/client";
import { getUserConversations, sendMessage } from "@/services/chatService";
import {
  MessageSquare,
  Search,
  CheckCheck,
  AlertTriangle,
  Send,
  FolderArchive,
  ArrowUpDown,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  MapPin,
  RefreshCw,
} from "lucide-react";

interface DemoMessage {
  id: string;
  sender: "seller" | "buyer";
  text: string;
  timestamp: string;
  seen: boolean;
}

interface DemoConversation {
  id: string;
  buyerName: string;
  buyerAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  orderId: string;
  orderItem: string;
  orderStatus: "Pending Acceptance" | "Awaiting Pickup" | "In Transit" | "Completed" | "Cancelled" | "Disputed" | "Escalated";
  orderType: "pickup" | "delivery";
  disputeDeadline?: string;
  messages: DemoMessage[];
  archived?: boolean;
  isReal?: boolean;
  listingId?: string | null;
}

const CANNED_REPLIES = [
  "Hello! I have confirmed your order and will dispatch it shortly. 📦",
  "Hi! I am ready for our physical pickup meetup as scheduled. See you soon! 🤝",
  "Thank you for your purchase! Please let me know if everything is in order. 📚",
  "I have logged a query with our logistics partner and will update you shortly.",
];

export const ChatsTab: React.FC = () => {
  const { user } = useAuth();
  
  // Tier checking
  const [isTier1, setIsTier1] = useState(false);
  const [loadingTier, setLoadingTier] = useState(true);

  // Filter/Sort State (Tier 1 Features)
  const [filterTab, setFilterTab] = useState<"all" | "active" | "disputed" | "needs_action">("all");
  const [sortBy, setSortBy] = useState<"recent" | "urgency">("recent");
  const [searchQuery, setSearchQuery] = useState("");

  // Selection & Input
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState("");

  // Bulk selection states (Tier 1 Feature)
  const [selectedConvs, setSelectedConvs] = useState<Record<string, boolean>>({});

  // 1. REAL CONVERSATIONS FROM BACKEND DB
  const [realConvs, setRealConvs] = useState<DemoConversation[]>([]);
  const [loadingReal, setLoadingReal] = useState(true);
  const [realMessages, setRealMessages] = useState<DemoMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // 2. DEMO CONVERSATIONS MOCK DATA
  const [conversations, setConversations] = useState<DemoConversation[]>([
    {
      id: "c-1",
      buyerName: "Sarah Jenkins",
      buyerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      lastMessage: "The book pages are torn and the binding is broken. I want a refund.",
      lastMessageTime: "10:15",
      unread: true,
      orderId: "ORD-178266-C65",
      orderItem: "Grade 11 Mathematics Textbook",
      orderStatus: "Disputed",
      orderType: "delivery",
      disputeDeadline: new Date(Date.now() + 18.5 * 60 * 60 * 1000).toISOString(),
      messages: [
        { id: "m-1-1", sender: "buyer", text: "Hi, I received the textbook today.", timestamp: "09:30", seen: true },
        { id: "m-1-2", sender: "seller", text: "Excellent! Let me know if you need anything else.", timestamp: "09:35", seen: true },
        { id: "m-1-3", sender: "buyer", text: "Wait, the book pages are torn and the binding is broken. I want a refund.", timestamp: "10:15", seen: false },
      ]
    },
    {
      id: "c-2",
      buyerName: "Michael Zulu",
      buyerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      lastMessage: "Hey, are you still good for 2pm tomorrow?",
      lastMessageTime: "09:40",
      unread: true,
      orderId: "ORD-178278-KLAL",
      orderItem: "Accounting Workbook Vol 2",
      orderStatus: "Awaiting Pickup",
      orderType: "pickup",
      messages: [
        { id: "m-2-1", sender: "seller", text: "Hi Michael, your order has been accepted. We can meet at the campus lockers.", timestamp: "Yesterday", seen: true },
        { id: "m-2-2", sender: "buyer", text: "Awesome. I scheduled the pickup for tomorrow.", timestamp: "09:00", seen: true },
        { id: "m-2-3", sender: "buyer", text: "Hey, are you still good for 2pm tomorrow?", timestamp: "09:40", seen: false },
      ]
    },
    {
      id: "c-3",
      buyerName: "Emily Watson",
      buyerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      lastMessage: "Thank you for the quick handover, the lab coat fits perfectly!",
      lastMessageTime: "Yesterday",
      unread: false,
      orderId: "ORD-178265-P32",
      orderItem: "Science Lab Coat & Goggles",
      orderStatus: "Completed",
      orderType: "pickup",
      messages: [
        { id: "m-3-1", sender: "seller", text: "Hi Emily, I am waiting near the science block.", timestamp: "Yesterday", seen: true },
        { id: "m-3-2", sender: "buyer", text: "On my way!", timestamp: "Yesterday", seen: true },
        { id: "m-3-3", sender: "buyer", text: "Thank you for the quick handover, the lab coat fits perfectly!", timestamp: "Yesterday", seen: true },
      ]
    }
  ]);

  // Load active subscription status
  useEffect(() => {
    const fetchTier = async () => {
      if (!user) return;
      try {
        setLoadingTier(true);
        const status = await checkLiveSubscription(user.id);
        setIsTier1(status.isTier1);
      } catch (err) {
        console.warn("Failed to check subscription:", err);
      } finally {
        setLoadingTier(false);
      }
    };
    fetchTier();
  }, [user]);

  // Fetch real database chats
  const loadRealData = async () => {
    if (!user?.id) return;
    try {
      setLoadingReal(true);
      const convList = await getUserConversations(user.id);
      
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          id, book_id, item_id, item_type, buyer_id, seller_id, status, delivery_status,
          order_type, pickup_status, total_amount, dispute_reason
        `)
        .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`);

      const mapped: DemoConversation[] = convList.map(c => {
        const isSeller = c.seller_id === user.id;
        const otherParty = isSeller ? c.buyer : c.seller;
        
        const relatedOrder = (ordersData || []).find(o => 
          o.book_id === c.listing_id || 
          o.item_id === c.listing_id
        );

        let orderStatus: any = "Pending Acceptance";
        if (relatedOrder) {
          if (relatedOrder.status === "completed" || relatedOrder.status === "delivered") orderStatus = "Completed";
          else if (relatedOrder.status === "cancelled") orderStatus = "Cancelled";
          else if (relatedOrder.status === "disputed") orderStatus = "Disputed";
          else if (relatedOrder.status === "committed" || relatedOrder.status === "awaiting_pickup") {
            orderStatus = relatedOrder.order_type === "pickup" ? "Awaiting Pickup" : "In Transit";
          }
        }

        return {
          id: c.id,
          buyerName: otherParty?.first_name 
            ? `${otherParty.first_name} ${otherParty.last_name || ""}`.trim() 
            : otherParty?.email?.split("@")[0] || "Buyer",
          buyerAvatar: otherParty?.profile_picture_url || undefined,
          lastMessage: c.last_message?.content || "No messages yet",
          lastMessageTime: c.last_message?.created_at 
            ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : "",
          unread: (c.unread_count || 0) > 0,
          orderId: relatedOrder ? `ORD-${relatedOrder.id.slice(-8).toUpperCase()}` : "NO ORDER",
          orderItem: c.listing?.title || "Marketplace Item",
          orderStatus: orderStatus,
          orderType: relatedOrder?.order_type === "pickup" ? "pickup" : "delivery",
          messages: [],
          isReal: true,
          listingId: c.listing_id
        };
      });

      setRealConvs(mapped);
    } catch (err) {
      console.error("Failed to load real conversations:", err);
    } finally {
      setLoadingReal(false);
    }
  };

  useEffect(() => {
    loadRealData();
  }, [user]);

  // Real-time messages loader
  useEffect(() => {
    if (!selectedConvId) {
      setRealMessages([]);
      return;
    }

    const active = [...realConvs, ...conversations].find(c => c.id === selectedConvId);
    if (!active?.isReal) {
      return;
    }

    const loadRealMessages = async () => {
      try {
        setLoadingMessages(true);
        const { data: msgList, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", selectedConvId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const mapped: DemoMessage[] = (msgList || []).map(m => {
          const isSeller = m.sender_id === user?.id;
          return {
            id: m.id,
            sender: isSeller ? "seller" : "buyer",
            text: m.content || "Media / attachment",
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            seen: !!m.read_at
          };
        });

        setRealMessages(mapped);

        // Mark messages as read in database
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", selectedConvId)
          .neq("sender_id", user?.id)
          .is("read_at", null);

      } catch (err) {
        console.error("Failed to load real messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadRealMessages();

    // Realtime channel for messages insert
    const channel = supabase.channel(`realtime-msgs-${selectedConvId}`);
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvId}` },
        (payload) => {
          const newMsg = payload.new;
          const isSeller = newMsg.sender_id === user?.id;
          const mappedMsg: DemoMessage = {
            id: newMsg.id,
            sender: isSeller ? "seller" : "buyer",
            text: newMsg.content || "Media / attachment",
            timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            seen: !!newMsg.read_at
          };
          setRealMessages(prev => {
            if (prev.some(m => m.id === mappedMsg.id)) return prev;
            return [...prev, mappedMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [selectedConvId, realConvs, user]);

  // Combine real and demo conversations
  const allConversations = useMemo(() => {
    return [...realConvs, ...conversations];
  }, [realConvs, conversations]);

  // Filter & sort visible conversations
  const visibleConversations = useMemo(() => {
    return allConversations.filter(conv => {
      // 1. If Free Tier, hide completed or archived orders
      if (!isTier1 && conv.orderStatus === "Completed") {
        return false;
      }
      if (conv.archived) {
        return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = conv.buyerName.toLowerCase().includes(query);
        const matchesItem = conv.orderItem.toLowerCase().includes(query);
        const matchesId = conv.orderId.toLowerCase().includes(query);
        if (!matchesName && !matchesItem && !matchesId) return false;
      }

      // Tab Filters (Tier 1 Features)
      if (isTier1) {
        if (filterTab === "active" && ["Completed", "Cancelled"].includes(conv.orderStatus)) return false;
        if (filterTab === "disputed" && conv.orderStatus !== "Disputed" && conv.orderStatus !== "Escalated") return false;
        if (filterTab === "needs_action" && conv.orderStatus !== "Disputed") return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort Options (Tier 1 Features)
      if (isTier1 && sortBy === "urgency") {
        if (a.orderStatus === "Disputed" && b.orderStatus !== "Disputed") return -1;
        if (a.orderStatus !== "Disputed" && b.orderStatus === "Disputed") return 1;
        if (a.disputeDeadline && b.disputeDeadline) {
          return new Date(a.disputeDeadline).getTime() - new Date(b.disputeDeadline).getTime();
        }
      }
      return 1;
    });
  }, [allConversations, isTier1, filterTab, sortBy, searchQuery]);

  // Active Selected Conversation
  const activeConv = useMemo(() => {
    return allConversations.find(c => c.id === selectedConvId) || null;
  }, [allConversations, selectedConvId]);

  // Active messages computed
  const activeMessages = useMemo(() => {
    if (!activeConv) return [];
    return activeConv.isReal ? realMessages : activeConv.messages;
  }, [activeConv, realMessages]);

  // Handle Mark Resolved
  const handleMarkResolved = async (convId: string) => {
    const isMock = !convId.includes("-");
    if (isMock) {
      setConversations(prev =>
        prev.map(c => {
          if (c.id === convId) {
            toast.success("Dispute issue resolved!");
            return {
              ...c,
              orderStatus: "Completed",
              disputeDeadline: undefined,
              messages: [
                ...c.messages,
                {
                  id: `m-res-${Date.now()}`,
                  sender: "seller",
                  text: "✨ Seller resolved the issue and completed the transaction.",
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  seen: true
                }
              ]
            };
          }
          return c;
        })
      );
      return;
    }

    try {
      // Find order to update
      const active = realConvs.find(c => c.id === convId);
      if (!active) return;
      const orderUUID = active.orderId.replace("ORD-", "");

      const { error } = await supabase
        .from("orders")
        .update({
          status: "completed",
          dispute_status: "resolved"
        })
        .ilike("id", `%${orderUUID}`);

      if (error) throw error;
      toast.success("Dispute resolved successfully!");
      loadRealData();
    } catch (err: any) {
      toast.error("Failed to resolve dispute: " + err.message);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || typedMessage;
    if (!text.trim() || !selectedConvId) return;

    const active = allConversations.find(c => c.id === selectedConvId);
    if (active?.isReal) {
      try {
        try {
          await sendMessage(selectedConvId, user?.id || "", text);
        } catch (sendErr) {
          // Fallback direct insert
          await supabase.from("messages").insert({
            conversation_id: selectedConvId,
            sender_id: user?.id,
            content: text,
            is_encrypted: false
          });
        }
        if (!textToSend) setTypedMessage("");
        loadRealData();
      } catch (err: any) {
        toast.error("Failed to send message: " + err.message);
      }
      return;
    }

    // Demo message flow
    setConversations(prev =>
      prev.map(c => {
        if (c.id === selectedConvId) {
          const newMsg: DemoMessage = {
            id: `msg-${Date.now()}`,
            sender: "seller",
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            seen: false
          };
          return {
            ...c,
            lastMessage: text,
            lastMessageTime: newMsg.timestamp,
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );
    if (!textToSend) setTypedMessage("");
  };

  // Bulk Actions
  const handleBulkMarkRead = () => {
    setConversations(prev =>
      prev.map(c => {
        if (selectedConvs[c.id]) {
          return { ...c, unread: false };
        }
        return c;
      })
    );
    setSelectedConvs({});
    toast.success("Marked selected chats as read");
  };

  const handleBulkArchive = () => {
    setConversations(prev =>
      prev.map(c => {
        if (selectedConvs[c.id]) {
          return { ...c, archived: true };
        }
        return c;
      })
    );
    setSelectedConvs({});
    toast.success("Archived selected conversations");
  };

  // Render Order Progress Timeline (Basic Feature for both)
  const renderOrderProgress = (status: string, orderType: "pickup" | "delivery") => {
    // Hide progress bar if order is completed or cancelled
    if (["Completed", "Cancelled", "completed", "cancelled"].includes(status)) {
      return null;
    }

    // Determine active index
    let activeIdx = 0;
    if (["committed", "awaiting_pickup", "pickup_scheduled", "ready_for_pickup", "Awaiting Pickup"].includes(status)) {
      activeIdx = 1;
    } else if (
      ["dispatched", "in_transit", "handed_over", "awaiting_buyer_confirmation", "In Transit", "Disputed", "Escalated", "disputed", "escalated"].includes(status)
    ) {
      activeIdx = 2;
    }

    const steps = [
      { label: "Pending Commit", desc: "Awaiting seller accept" },
      { label: "Accepted / Ready", desc: orderType === "pickup" ? "Meetup scheduled" : "Ready for courier" },
      { label: "Dispatched / Handoff", desc: orderType === "pickup" ? "Meetup handover" : "In transit" },
      { label: "Release Funds", desc: "Awaiting confirm" }
    ];

    return (
      <div className="bg-gray-50/70 px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between gap-1 max-w-lg mx-auto">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeIdx;
            const isCurrent = idx === activeIdx;

            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <div
                    className={`flex-1 h-0.5 min-w-[20px] transition-all ${
                      idx <= activeIdx ? "bg-book-600" : "bg-gray-200"
                    }`}
                  />
                )}
                <div className="flex flex-col items-center space-y-0.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                      isCompleted
                        ? "bg-book-600 text-white shadow-sm"
                        : isCurrent
                        ? "bg-book-50 border-2 border-book-600 text-book-700 font-bold"
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </div>
                  <div className="text-center">
                    <p className={`text-[8.5px] font-bold ${isCurrent ? "text-book-700" : "text-gray-500"}`}>
                      {step.label}
                    </p>
                    <p className="text-[7px] text-gray-400 font-medium hidden sm:block">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden border-gray-200 h-[600px] md:h-[680px] shadow-sm animate-fadeIn bg-white">
      <div className="grid grid-cols-1 md:grid-cols-12 h-full">
        
        {/* 1. CHATS LIST COLUMN */}
        <div className={`md:col-span-4 border-r border-gray-100 flex flex-col h-full ${activeConv ? 'hidden md:flex' : 'flex'}`}>
          {/* List Header & Search */}
          <div className="p-4 border-b border-gray-100 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-book-600" /> Store Inbox
              </h3>
              {!isTier1 && (
                <Badge variant="outline" className="bg-gray-100 text-gray-500 text-[9px] border-0 font-bold">
                  Free Version
                </Badge>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search buyer name or order..."
                className="pl-9 text-xs rounded-xl h-9 border-gray-200"
              />
            </div>

            {/* TIER 1 FEATURE: Filters & Sorting Header Tab */}
            {isTier1 ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span className="font-bold uppercase tracking-wider">Quick Filters</span>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-indigo-650" onClick={() => setSortBy(s => s === "recent" ? "urgency" : "recent")}>
                    <ArrowUpDown className="h-3 w-3" />
                    <span>Sort: {sortBy === "recent" ? "Recent" : "Dispute Deadline"}</span>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "disputed", label: "Disputed" },
                    { id: "needs_action", label: "Needs Action" }
                  ].map(tab => (
                    <Button
                      key={tab.id}
                      variant={filterTab === tab.id ? "default" : "outline"}
                      onClick={() => setFilterTab(tab.id as any)}
                      className={`h-6 text-[9px] px-2 rounded-lg font-bold ${filterTab === tab.id ? 'bg-book-600 hover:bg-book-700 text-white' : 'text-gray-600 border-gray-200 bg-white'}`}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              /* Soft Nudge Banner if user has multiple active conversations */
              visibleConversations.length >= 2 && (
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-blue-900 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-blue-600" /> Filter & Sort Urgency
                    </p>
                    <p className="text-[8px] text-blue-700 mt-0.5 truncate">Upgrade to Tier 1 to filter disputes closest to deadline.</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-blue-600 shrink-0" />
                </div>
              )
            )}

            {/* TIER 1 FEATURE: Bulk Actions Panel */}
            {isTier1 && Object.values(selectedConvs).some(Boolean) && (
              <div className="flex gap-2 p-2 bg-gray-50 border border-gray-150 rounded-xl items-center justify-between shrink-0">
                <span className="text-[9px] font-bold text-gray-500">Selected</span>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={handleBulkMarkRead} className="h-6 text-[9px] font-bold text-indigo-650 hover:bg-indigo-50 px-2 rounded-lg gap-1">
                    <CheckCheck className="h-3 w-3" /> Read
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleBulkArchive} className="h-6 text-[9px] font-bold text-gray-600 hover:bg-gray-100 px-2 rounded-lg gap-1">
                    <FolderArchive className="h-3 w-3" /> Archive
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Conversations Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loadingReal && realConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                <span className="text-[10px] text-gray-400">Loading store chats...</span>
              </div>
            ) : null}

            {visibleConversations.map(conv => {
              const isSelected = conv.id === selectedConvId;
              const isDisputed = conv.orderStatus === "Disputed" || conv.orderStatus === "Escalated";
              const isChecked = !!selectedConvs[conv.id];

              return (
                <div
                  key={conv.id}
                  className={`flex items-start gap-2.5 p-3.5 transition-all cursor-pointer relative ${
                    isSelected ? "bg-book-50/40" : "hover:bg-gray-50 bg-white"
                  }`}
                  onClick={() => {
                    setSelectedConvId(conv.id);
                    conv.unread = false;
                  }}
                >
                  {/* TIER 1 Bulk Checkbox */}
                  {isTier1 && (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        e.stopPropagation();
                        setSelectedConvs(prev => ({ ...prev, [conv.id]: e.target.checked }));
                      }}
                      className="mt-1 h-3.5 w-3.5 rounded border-gray-300 text-book-600 focus:ring-book-500"
                    />
                  )}

                  {/* Buyer Avatar */}
                  <img
                    src={conv.buyerAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                    alt={conv.buyerName}
                    className="w-9 h-9 rounded-full object-cover border border-gray-100 shrink-0 mt-0.5"
                  />

                  {/* Details (Stacked text preview exactly to the left) */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-800 text-[11px] truncate text-left">{conv.buyerName}</h4>
                      <span className="text-[9px] text-gray-400 font-semibold">{conv.lastMessageTime}</span>
                    </div>

                    <p className={`text-[10px] truncate mt-0.5 text-left ${conv.unread ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                      {conv.lastMessage}
                    </p>

                    {/* Meta labels */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2 justify-start text-left">
                      <Badge variant="outline" className="text-[8px] bg-gray-50 text-gray-500 font-semibold border-gray-200">
                        {conv.orderId}
                      </Badge>
                      <Badge className={`text-[8px] font-black border-0 uppercase ${
                        isDisputed 
                          ? "bg-red-50 text-red-650" 
                          : conv.orderStatus === "Completed" 
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-50 text-blue-800"
                      }`}>
                        {conv.orderStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Unread dot indicator */}
                  {conv.unread && (
                    <div className="absolute right-3.5 top-7 w-2 h-2 rounded-full bg-book-600 animate-pulse" />
                  )}
                </div>
              );
            })}

            {visibleConversations.length === 0 && (
              <div className="text-center py-10">
                <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-bold">No inbox messages found</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. CHAT VIEW CONTENT COLUMN */}
        <div className={`md:col-span-8 flex flex-col h-full bg-gray-50/20 ${activeConv ? 'flex' : 'hidden md:flex items-center justify-center'}`}>
          {activeConv ? (
            <>
              {/* Chat View Header - Order Context (Basic Feature for both) */}
              <div className="p-3 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedConvId(null)} className="h-8 md:hidden px-2 rounded-lg">
                    ← Back
                  </Button>
                  <img
                    src={activeConv.buyerAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                    alt={activeConv.buyerName}
                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-150"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-[11px]">{activeConv.buyerName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-gray-400 font-bold">{activeConv.orderId}</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[120px] inline-block font-semibold">({activeConv.orderItem})</span>
                      <Badge className={`text-[8px] font-black border-0 uppercase ${
                        activeConv.orderStatus === "Disputed" 
                          ? "bg-red-50 text-red-650" 
                          : activeConv.orderStatus === "Completed" 
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-50 text-blue-800"
                      }`}>
                        {activeConv.orderStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Badge className="bg-gray-100 text-gray-600 text-[9px] font-semibold border-0 capitalize">
                  🤝 {activeConv.orderType === "pickup" ? "Meetup Pickup" : "Courier Delivery"}
                </Badge>
              </div>

              {/* DYNAMIC PROGRESS TIMELINE TRACKER (Basic Feature for both - Hidden if Completed/Cancelled) */}
              {renderOrderProgress(activeConv.orderStatus, activeConv.orderType)}

              {/* Centered Dispute Warning Banner & Inline Resolution (Basic Feature for both) */}
              {activeConv.orderStatus === "Disputed" && (
                <div className="bg-red-50 border-b border-red-200 p-4 flex flex-col items-center justify-center text-center gap-3 shrink-0">
                  <div className="flex flex-col items-center gap-1.5 max-w-md">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                    <p className="text-xs font-black text-red-950">Active Buyer Dispute</p>
                    <p className="text-[10px] text-red-750 leading-relaxed">
                      Issue reported: "{activeConv.lastMessage || "Torn pages"}". Payout escrow is locked. Please negotiate with the buyer or resolve within 48h.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleMarkResolved(activeConv.id)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] h-8.5 px-6 shadow flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark Issue Resolved
                  </Button>
                </div>
              )}

              {/* Messages Chronological Viewer */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20">
                {loadingMessages && (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-[10px] text-gray-400">Loading chat history...</span>
                  </div>
                )}
                
                {activeMessages.map((msg, idx) => {
                  const isSeller = msg.sender === "seller";
                  const isActionNote = msg.text.startsWith("✨");

                  if (isActionNote) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-150 px-3 py-1 rounded-full shadow-sm text-center">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isSeller ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%] space-y-0.5">
                        <div className={`p-3 rounded-2xl text-xs leading-normal shadow-sm ${
                          isSeller 
                            ? "bg-book-600 text-white rounded-tr-none" 
                            : "bg-white text-gray-800 border rounded-tl-none"
                        }`}>
                          {msg.text}
                        </div>
                        <div className={`flex items-center gap-1 text-[9px] text-gray-400 px-1 mt-0.5 ${
                          isSeller ? "justify-end" : "justify-start"
                        }`}>
                          <span>{msg.timestamp}</span>
                          {/* TIER 1 FEATURE: Read Receipts */}
                          {isSeller && (
                            <CheckCheck className={`h-3 w-3 ${
                              isTier1 && (msg.seen || idx < activeMessages.length - 1)
                                ? "text-blue-500" 
                                : "text-gray-300"
                            }`} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TIER 1 FEATURE: Quick Canned Replies */}
              {isTier1 && (
                <div className="p-2 bg-gray-50 border-t border-gray-150 shrink-0 space-y-1.5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Quick Responses</p>
                  <div className="flex gap-1.5 overflow-x-auto pr-2 pb-1 scrollbar-thin">
                    {CANNED_REPLIES.map(reply => (
                      <Button
                        key={reply}
                        variant="outline"
                        onClick={() => handleSendMessage(reply)}
                        className="h-7 text-[9px] rounded-lg border-gray-200 text-gray-700 hover:bg-gray-100 bg-white whitespace-nowrap shrink-0 px-2.5 font-bold"
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center shrink-0">
                <Input
                  value={typedMessage}
                  onChange={e => setTypedMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  placeholder="Type a message..."
                  className="rounded-xl h-10 border-gray-200 text-xs flex-1"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!typedMessage.trim()}
                  size="icon"
                  className="h-10 w-10 bg-book-600 hover:bg-book-700 text-white rounded-xl shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Select a conversation</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Select a message from the list to start chatting with buyers.
              </p>
            </div>
          )}
        </div>

      </div>
    </Card>
  );
};

export default ChatsTab;
