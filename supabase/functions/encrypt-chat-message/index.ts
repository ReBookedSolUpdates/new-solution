import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function getEncryptionKey(): string | null {
  return Deno.env.get('ENCRYPTION_KEY_V1') || Deno.env.get('ENCRYPTION_KEY') || null;
}

async function importAesKey(rawKeyString: string): Promise<CryptoKey> {
  let keyBytes: Uint8Array;
  try {
    const decoded = base64ToBytes(rawKeyString);
    if (decoded.byteLength === 32) {
      keyBytes = decoded;
    } else {
      throw new Error('not 32 bytes');
    }
  } catch {
    const enc = new TextEncoder();
    keyBytes = enc.encode(rawKeyString);
    if (keyBytes.byteLength !== 32) {
      throw new Error('INVALID_KEY_LENGTH');
    }
  }
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
}

async function encryptGCM(plaintext: string, keyString: string) {
  const cryptoKey = await importAesKey(keyString);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    encoded
  );

  const full = new Uint8Array(encrypted);
  const tagBytes = full.slice(full.byteLength - 16);
  const cipherBytes = full.slice(0, full.byteLength - 16);

  return {
    ciphertext: bytesToBase64(cipherBytes),
    iv: bytesToBase64(iv),
    authTag: bytesToBase64(tagBytes),
    version: 1
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { conversation_id, content, media_url, media_type } = body;

    if (!conversation_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'conversation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is participant in conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, buyer_id, seller_id')
      .eq('id', conversation_id)
      .single();

    if (convError || !conv) {
      return new Response(
        JSON.stringify({ success: false, error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (conv.buyer_id !== user.id && conv.seller_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not a participant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for personal info patterns
    const personalInfoPatterns = [
      /\b\d{10,13}\b/g,
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      /\b\d{6,}\b/g,
    ];
    const isFlagged = content ? personalInfoPatterns.some(p => { p.lastIndex = 0; return p.test(content); }) : false;

    // Encrypt content if present
    let encryptedContent: string | null = null;
    const encryptionKey = getEncryptionKey();

    if (content && encryptionKey) {
      const bundle = await encryptGCM(content, encryptionKey);
      encryptedContent = JSON.stringify(bundle);
    }

    // Insert message with encrypted content
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        content: null, // Don't store plaintext
        content_encrypted: encryptedContent,
        is_encrypted: !!encryptedContent,
        media_url: media_url || null,
        media_type: media_type || null,
        is_flagged: isFlagged,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert message:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
      .eq('id', conversation_id);

    // Return message with decrypted content for the sender
    return new Response(
      JSON.stringify({
        success: true,
        message: {
          ...message,
          content: content, // Return plaintext to sender
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('encrypt-chat-message error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
