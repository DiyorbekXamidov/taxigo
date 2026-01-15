import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8493109056:AAG6PkzIneCyo3O6Gwt58T8kkZycoAo-pJk';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    // Get bot info
    if (action === 'get_bot_info') {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
      const result = await response.json();
      
      if (result.ok) {
        return new Response(JSON.stringify({ 
          success: true, 
          bot_username: result.result.username 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ success: false, error: 'Bot not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify Telegram authentication
    if (action === 'verify_telegram_auth') {
      const authData = params as TelegramAuthData;
      
      // Verify hash
      const isValid = await verifyTelegramAuth(authData);
      
      if (!isValid) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid authentication data' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if auth is not expired (allow 1 day)
      const authTime = authData.auth_date * 1000;
      if (Date.now() - authTime > 86400000) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Authentication expired' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create or get user from Supabase
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const email = `telegram_${authData.id}@taxi.local`;
      const password = `tg_${authData.id}_${TELEGRAM_BOT_TOKEN.slice(0, 10)}`;
      
      // Try to sign in first
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      let isNewUser = false;

      if (signInError) {
        // User doesn't exist, create new one
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: `${authData.first_name}${authData.last_name ? ' ' + authData.last_name : ''}`,
            telegram_id: authData.id,
            telegram_username: authData.username,
            avatar_url: authData.photo_url,
          }
        });

        if (createError) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: createError.message 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        isNewUser = true;
        
        // Sign in the new user
        const { data: newSignIn } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        signInData = newSignIn;
      }

      return new Response(JSON.stringify({ 
        success: true,
        isNewUser,
        session: signInData?.session,
        user: signInData?.user,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Telegram auth error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function verifyTelegramAuth(authData: TelegramAuthData): Promise<boolean> {
  try {
    const { hash, ...data } = authData;
    
    // Create data-check-string
    const checkArr = Object.entries(data)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${v}`)
      .sort();
    const checkString = checkArr.join('\n');
    
    // Create secret key from bot token
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.digest('SHA-256', encoder.encode(TELEGRAM_BOT_TOKEN));
    
    // Create HMAC-SHA256
    const key = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(checkString));
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signatureHex === hash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}
