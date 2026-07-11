import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Conversation,
  ChatMessage,
  getUserConversations,
  getMessages,
  sendMessage,
  getOrCreateConversation,
} from "@/services/chatService";
import { toast } from "sonner";

export function useConversations(includeArchived = false) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const data = await getUserConversations(user.id, includeArchived);
      setConversations(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to load conversations:", errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, includeArchived]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel("conversations-updates");
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => { load(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { load(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => { load(); });

    // subscribe and ignore the subscribe result; keep the channel object for removal
    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, load]);

  return { conversations, isLoading, refresh: load };
}

export function useChatMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
      const data = await getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to load messages:", errorMsg);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Real-time: INSERT new messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    let retryTimeout: NodeJS.Timeout;
    let isSubscribed = true;

    const setupSubscription = () => {
      const channel = supabase.channel(`messages-${conversationId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: conversationId },
        },
      });

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map(m => m.id === updated.id ? updated : m));
        }
      );

      channel.subscribe((status) => {
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          // Attempt to reconnect after 3 seconds
          if (isSubscribed) {
            retryTimeout = setTimeout(setupSubscription, 3000);
          }
        }
      });

      return channel;
    };

    const channel = setupSubscription();

    return () => {
      isSubscribed = false;
      clearTimeout(retryTimeout);
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const send = useCallback(
    async (content: string, mediaUrl?: string, mediaType?: string): Promise<{ success: boolean; content?: string }> => {
      if (!conversationId || !user?.id) return { success: false, content };

      // Create optimistic message immediately with a temporary ID
      const optimisticId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
        is_system: false,
        reference_card: null,
      } as ChatMessage;

      // Add message optimistically to UI immediately
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        // Send to server asynchronously — no loading state change, fully optimistic
        const sent = await sendMessage(conversationId, user.id, content, mediaUrl, mediaType);

        // Replace optimistic message with actual server message
        setMessages((prev) => {
          return prev.map((m) =>
            m.id === optimisticId ? sent : m
          );
        });

        // Fire-and-forget notification
        supabase.functions.invoke("chat-notification", {
          body: { conversation_id: conversationId, sender_id: user.id, content },
        }).catch(() => {});

        return { success: true };
      } catch (err) {
        // Remove optimistic message on error — caller restores content to input
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return { success: false, content };
      }
    },
    [conversationId, user?.id]
  );

  return { messages, isLoading, isSending, send, refresh: loadMessages };
}

export function useStartConversation() {
  const { user } = useAuth();
  const [isStarting, setIsStarting] = useState(false);

  const startConversation = useCallback(
    async (listingId: string, sellerId: string, itemType: string = "book"): Promise<string | null> => {
      if (!user?.id) {
        toast.error("Please log in to chat with sellers");
        return null;
      }
      if (user.id === sellerId) {
        toast.error("You can't chat with yourself");
        return null;
      }
      try {
        setIsStarting(true);
        const conversation = await getOrCreateConversation(listingId, user.id, sellerId, itemType as "book" | "school_supply" | "uniform");
        return conversation.id;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
        console.error("Failed to start conversation:", errorMsg);
        toast.error("Failed to start conversation");
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [user?.id]
  );

  return { startConversation, isStarting };
}
