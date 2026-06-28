import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  listing_id: string | null;
  item_type?: "book" | "uniform" | "school_supply" | null;
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
    description?: string;
    additional_images?: string[];
    item_type?: "book" | "uniform" | "school_supply";
    seller?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      profile_picture_url?: string | null;
      full_name?: string;
    } | null;
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
  message_type?: "text" | "time_location" | "system";
  is_system?: boolean;
  content?: string | null;
  content_encrypted: string | null;
  is_encrypted: boolean;
  media_url: string | null;
  media_type: string | null;
  is_flagged: boolean;
  read_at: string | null;
  created_at: string;
  reference_card?: ListingReferenceCardPayload | null;
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

const ITEM_TABLES: { table: "books" | "uniforms" | "school_supplies"; type: string }[] = [
  { table: "books", type: "book" },
  { table: "uniforms", type: "uniform" },
  { table: "school_supplies", type: "school_supply" },
];

export async function resolveListing(listingId: string, hintedType?: "book" | "uniform" | "school_supply" | null): Promise<{
  id: string;
  title: string;
  price: number;
  image_url: string;
  front_cover: string | null;
  description: string;
  additional_images: string[];
  item_type: "book" | "uniform" | "school_supply";
  seller?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    profile_picture_url?: string | null;
    full_name: string;
  } | null;
} | null> {
  const ordered = hintedType
    ? [...ITEM_TABLES.filter((t) => t.type === hintedType), ...ITEM_TABLES.filter((t) => t.type !== hintedType)]
    : ITEM_TABLES;
  for (const { table, type } of ordered) {
    try {
      // Books table has front_cover; uniforms and school_supplies don't
      const selectFields = type === "book"
        ? `id, title, price, image_url, front_cover, description, additional_images, seller_id, profiles!seller_id(first_name,last_name,email,profile_picture_url)`
        : `id, title, price, image_url, description, additional_images, seller_id, profiles!seller_id(first_name,last_name,email,profile_picture_url)`;

      const { data } = await supabase
        .from(table)
        .select(selectFields)
        .eq("id", listingId)
        .maybeSingle();
      if (data) {
        const sellerProfile = (data as any).profiles || null;
        const fullName = sellerProfile
          ? [sellerProfile.first_name, sellerProfile.last_name].filter(Boolean).join(" ") || sellerProfile.email?.split("@")[0] || ""
          : "";
        return {
          id: (data as any).id,
          title: (data as any).title || "",
          price: (data as any).price || 0,
          image_url: (data as any).image_url || (data as any).front_cover || "",
          front_cover: (data as any).front_cover ?? null,
          description: (data as any).description || "",
          additional_images: (data as any).additional_images || [],
          item_type: type as "book" | "uniform" | "school_supply",
          seller: sellerProfile
            ? {
                id: sellerProfile.id,
                first_name: sellerProfile.first_name,
                last_name: sellerProfile.last_name,
                email: sellerProfile.email,
                profile_picture_url: sellerProfile.profile_picture_url,
                full_name: fullName,
              }
            : null,
        };
      }
    } catch {
      /* table may not exist or RLS blocks; skip */
    }
  }
  return null;
}

export interface ListingReferenceCardPayload {
  listing_id: string;
  item_type: "book" | "uniform" | "school_supply";
  title: string;
  description: string;
  thumbnail_url: string;
  price: number;
  listing_url: string;
  seller_id: string;
}

async function ensureListingReferenceCard(
  conversationId: string,
  listingId: string,
  itemType: "book" | "uniform" | "school_supply",
  senderId: string
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("message_type", "system")
    .eq("reference_card->>listing_id", listingId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.warn("[chat] failed to check listing reference card", existingError);
    return;
  }
  if (existing) return;

  const listing = await resolveListing(listingId, itemType);
  if (!listing) return;

  const listingUrl =
    listing.item_type === "uniform"
      ? `/school-uniform/${listing.id}`
      : listing.item_type === "school_supply"
      ? `/supplies/${listing.id}`
      : `/books/${listing.id}`;

  const reference_card: ListingReferenceCardPayload = {
    listing_id: listing.id,
    item_type: listing.item_type,
    title: listing.title,
    description: listing.description || "",
    thumbnail_url: listing.image_url || listing.front_cover || "",
    price: listing.price,
    listing_url: listingUrl,
    seller_id: listing.seller?.id || senderId,
  };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    message_type: "system",
    is_system: true,
    is_flagged: false,
    is_encrypted: false,
    content_encrypted: null,
    media_url: null,
    media_type: null,
    read_at: null,
    reference_card,
  });

  if (error) {
    console.warn("[chat] failed to insert listing reference card", error);
  }
}

export async function getOrCreateConversation(
  listingId: string,
  buyerId: string,
  sellerId: string,
  itemType: "book" | "uniform" | "school_supply" = "book"
): Promise<Conversation> {
  // Validate inputs
  if (!buyerId || !sellerId || !listingId) {
    throw new Error("Missing required conversation parameters: buyerId, sellerId, or listingId");
  }

  // First, check if buyer and seller have ANY active conversation (regardless of listing)
  // Use .limit(1) and .order() to handle multiple conversations gracefully
  const { data: existingConversation, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("Error finding existing conversation:", findError);
    throw new Error(`Failed to find conversations: ${findError.message}`);
  }

  if (existingConversation) {
    // Reuse existing conversation and add listing reference
    await ensureListingReferenceCard(existingConversation.id, listingId, itemType, buyerId);
    return existingConversation as Conversation;
  }

  // No existing conversation, create a new one
  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId, item_type: itemType })
    .select()
    .single();

  if (createError) {
    console.error("Error creating conversation:", createError);
    throw new Error(`Failed to create conversation: ${createError.message}`);
  }

  await ensureListingReferenceCard(created.id, listingId, itemType, buyerId);
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
      const [buyerResult, sellerResult, lastMsgResult, unreadResult] = await Promise.allSettled([
        supabase.from("profiles").select("id, first_name, last_name, email, profile_picture_url").eq("id", conv.buyer_id).maybeSingle(),
        supabase.from("profiles").select("id, first_name, last_name, email, profile_picture_url").eq("id", conv.seller_id).maybeSingle(),
        supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conv.id).neq("sender_id", userId).is("read_at", null),
      ]);

      const listing = conv.listing_id ? await resolveListing(conv.listing_id, conv.item_type) : null;

      const getResult = (result: PromiseSettledResult<any>) =>
        result.status === 'fulfilled' ? result.value.data || undefined : undefined;

      const unreadCount = unreadResult.status === 'fulfilled' ? (unreadResult.value as any).count || 0 : 0;

      let lastMessage = getResult(lastMsgResult);
      if (lastMessage?.is_encrypted && lastMessage?.content_encrypted) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const { data: decData, error: decErr } = await supabase.functions.invoke("decrypt-chat-messages", {
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: { conversation_id: conv.id, limit: 1 },
            });
            if (!decErr && decData?.success && Array.isArray(decData.messages) && decData.messages.length > 0) {
              const m = decData.messages[0];
              lastMessage = { ...lastMessage, content: m.content || "Tap to view message" };
            } else {
              lastMessage = { ...lastMessage, content: lastMessage.content || "Tap to view message" };
            }
          } else {
            lastMessage = { ...lastMessage, content: lastMessage.content || "Tap to view message" };
          }
        } catch (e) {
          lastMessage = { ...lastMessage, content: lastMessage.content || "Tap to view message" };
        }
      }

      return {
        ...conv,
        listing: listing || undefined,
        buyer: getResult(buyerResult),
        seller: getResult(sellerResult),
        last_message: lastMessage,
        unread_count: unreadCount,
      } as Conversation;
    })
  );

  return enriched;
}

/** Fetch a signed URL for a private chat-media object path (or return as-is if already a URL). */
export async function getSignedMediaUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage.from("chat-media").createSignedUrl(pathOrUrl, 60 * 60);
  if (error) {
    console.warn("[chat] signed url failed", error);
    return pathOrUrl;
  }
  return data.signedUrl;
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const { data, error } = await supabase.functions.invoke("decrypt-chat-messages", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { conversation_id: conversationId },
      });
      if (!error && data?.success && data?.messages) {
        return data.messages as ChatMessage[];
      }
      console.warn("Decrypt edge function failed, falling back to direct query:", error || data?.error);
    }
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

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  mediaUrl?: string,
  mediaType?: string
): Promise<ChatMessage> {
  const { data: { session } } = await supabase.auth.getSession();

  let fallbackError: any = null;

  if (session?.access_token) {
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
    fallbackError = error || data?.error;
    console.warn("Encrypt edge function failed, cannot send message without encryption:", fallbackError);
  }

  const isFlagged = checkForPersonalInfo(content);

  throw new Error(
    "Failed to send message: Chat encryption service unavailable. " +
      (fallbackError?.message || fallbackError || "Encryption must succeed before message storage can proceed.")
  );
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
