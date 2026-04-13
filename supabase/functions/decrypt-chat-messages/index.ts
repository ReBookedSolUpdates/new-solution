import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function base64ToBytes(b64: string): Uint8Array {
  const normalized = b64.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64.length / 4) * 4, '=');
  const bin = atob(normalized);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function getEncryptionKey(): string | null {
  return Deno.env.get('ENCRYPTION_KEY_V1') || Deno.env.get('ENCRYPTION_KEY') || null;
}

async function importAesKeyForDecrypt(rawKeyString: string): Promise<CryptoKey> {
  let keyBytes = new TextEncoder().encode(rawKeyString);
  if (keyBytes.byteLength !== 32) {
    const b64 = base64ToBytes(rawKeyString);
    if (b64.byteLength !== 32) throw new Error('INVALID_KEY_LENGTH');
    keyBytes = b64;
  }
  return crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, 'AES-GCM', false, ['decrypt']);
}

interface EncryptedBundle {
  ciphertext: string;
  iv: string;
  authTag: string;
  version?: number;
}

async function decryptGCM(bundle: EncryptedBundle, keyString: string): Promise<string> {
  const cryptoKey = await importAesKeyForDecrypt(keyString);
  const cipherBytes = base64ToBytes(bundle.ciphertext);
  const ivBytes = base64ToBytes(bundle.iv);
  const authTagBytes = base64ToBytes(bundle.authTag);

  const combined = new Uint8Array(cipherBytes.byteLength + authTagBytes.byteLength);
  combined.set(cipherBytes, 0);
  combined.set(authTagBytes, cipherBytes.byteLength);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBytes), tagLength: 128 },
    cryptoKey,
    new Uint8Array(combined)
  );
  return new TextDecoder().decode(new Uint8Array(decrypted));
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
    const { conversation_id } = body;

    if (!conversation_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'conversation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is participant
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
      // Check if admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminRole) {
        return new Response(
          JSON.stringify({ success: false, error: 'Not authorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    if (msgError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encryptionKey = getEncryptionKey();
    
    // Decrypt messages
    const decryptedMessages = await Promise.all(
      (messages || []).map(async (msg: any) => {
        if (msg.is_encrypted && msg.content_encrypted && encryptionKey) {
          try {
            const bundle: EncryptedBundle = JSON.parse(msg.content_encrypted);
            const decryptedContent = await decryptGCM(bundle, encryptionKey);
            return { ...msg, content: decryptedContent };
          } catch (e) {
            console.error('Failed to decrypt message:', msg.id, e);
            return { ...msg, content: '[Unable to decrypt message]' };
          }
        }
        // Non-encrypted messages pass through as-is
        return msg;
      })
    );

    return new Response(
      JSON.stringify({ success: true, messages: decryptedMessages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('decrypt-chat-messages error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
