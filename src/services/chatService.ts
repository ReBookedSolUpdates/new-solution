import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    image_url: string;
    front_cover: string | null;
  };
  buyer?: { id: string; first_name: string | null; last_name: string | null; email: string | null; profile_picture_url?: string | null };
  seller?: { id: string; first_name: string | null; last_name: string | null; email: string | null; profile_picture_url?: string | null };
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  content_encrypted: string | null;
  is_encrypted: boolean;
  media_url: string | null;
  media_type: string | null;
  is_flagged: boolean;
  read_at: string | null;
  created_at: string;
}

const PERSONAL_INFO_PATTERNS = [
  /\b\d{10,13}\b/g,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  /\b\d{6,}\b/g,
];

export function checkForPersonalInfo(content: string): boolean {
  return PERSONAL_INFO_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(content);
  });
}

export async function getOrCreateConversation(
  listingId: string,
  buyerId: string,
  sellerId: string
): Promise<Conversation> {
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as Conversation;

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
    .select()
    .single();

  if (createError) throw createError;
  return created as Conversation;
}

export async function getUserConversations(userId: string, includeArchived = false): Promise<Conversation[]> {
  let query = supabase
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;
  if (error) throw error;

  const conversations = data as Conversation[];
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const [listingResult, buyerResult, sellerResult, lastMsgResult, unreadResult] = await Promise.allSettled([
        conv.listing_id
          ? supabase.from("books").select("id, title, price, image_url, front_cover").eq("id", conv.listing_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from("profiles").select("id, first_name, last_name, email, profile_picture_url").eq("id", conv.buyer_id).maybeSingle(),
        supabase.from("profiles").select("id, first_name, last_name, email, profile_picture_url").eq("id", conv.seller_id).maybeSingle(),
        supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conv.id).neq("sender_id", userId).is("read_at", null),
      ]);

      const getResult = (result: PromiseSettledResult<any>) =>
        result.status === 'fulfilled' ? result.value.data || undefined : undefined;

      const unreadCount = unreadResult.status === 'fulfilled' ? (unreadResult.value as any).count || 0 : 0;

      // Decrypt last message if encrypted
      let lastMessage = getResult(lastMsgResult);
      if (lastMessage?.is_encrypted && lastMessage?.content_encrypted) {
        // For the list, just show a placeholder - full decryption happens in ChatView
        lastMessage = { ...lastMessage, content: lastMessage.content || "🔒 Encrypted message" };
      }

      return {
        ...conv,
        listing: getResult(listingResult),
        buyer: getResult(buyerResult),
        seller: getResult(sellerResult),
        last_message: lastMessage,
        unread_count: unreadCount,
      } as Conversation;
    })
  );

  return enriched;
}

/**
 * Get messages for a conversation - uses edge function for decryption
 */
export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      // Use edge function for server-side decryption
      const { data, error } = await supabase.functions.invoke("decrypt-chat-messages", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { conversation_id: conversationId },
      });

      if (!error && data?.success && data?.messages) {
        return data.messages as ChatMessage[];
      }
      console.warn("Decrypt edge function failed, falling back to direct query:", error || data?.error);
    }

    // Fallback: direct query (unencrypted messages will show, encrypted ones won't)
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return [];
    }
    return (data || []) as ChatMessage[];
  } catch (err) {
    console.error("Error in getMessages:", err);
    return [];
  }
}

/**
 * Send a message - uses edge function for server-side encryption
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  mediaUrl?: string,
  mediaType?: string
): Promise<ChatMessage> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    // Use edge function for server-side encryption
    const { data, error } = await supabase.functions.invoke("encrypt-chat-message", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: {
        conversation_id: conversationId,
        content,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      },
    });

    if (!error && data?.success && data?.message) {
      return data.message as ChatMessage;
    }
    console.warn("Encrypt edge function failed, falling back to direct insert:", error || data?.error);
  }

  // Fallback: direct insert (unencrypted)
  const isFlagged = checkForPersonalInfo(content);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      is_flagged: isFlagged,
    })
    .select()
    .single();

  if (error) throw new Error("Failed to send message: " + error.message);

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data as ChatMessage;
}

export async function reportConversation(
  conversationId: string,
  reportedBy: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_reports")
    .insert({ conversation_id: conversationId, reported_by: reportedBy, reason });
  if (error) throw error;
}

export async function archiveConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ status: "archived" })
    .eq("id", conversationId);
  if (error) throw error;
}
