import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
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
    console.log('Telegram auth action:', action);

    if (action === 'get_bot_info') {
      return await getBotInfo();
    } else if (action === 'verify_telegram_auth') {
      return await verifyTelegramAuth(params as TelegramAuthData);
    } else if (action === 'handle_start') {
      return await handleStartCommand(params.chatId, params.startParam);
    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in telegram auth function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getBotInfo() {
  if (!TELEGRAM_BOT_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Telegram not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
  const result = await response.json();

  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to get bot info' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      bot_username: result.result.username 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256(data: string): Promise<ArrayBuffer> {
  const encoded = new TextEncoder().encode(data);
  return await crypto.subtle.digest("SHA-256", encoded);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyTelegramHash(data: TelegramAuthData): Promise<boolean> {
  const { hash, ...authData } = data;
  
  // Create data check string
  const dataCheckArr = Object.entries(authData)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .sort();
  
  const dataCheckString = dataCheckArr.join('\n');
  
  // Create secret key using SHA256 of bot token
  const secretKey = await sha256(TELEGRAM_BOT_TOKEN);
  
  // Calculate hash
  const calculatedHashBuffer = await hmacSha256(secretKey, dataCheckString);
  const calculatedHash = arrayBufferToHex(calculatedHashBuffer);
  
  return calculatedHash === hash;
}

async function verifyTelegramAuth(authData: TelegramAuthData) {
  if (!TELEGRAM_BOT_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Telegram not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check auth_date (must be within 24 hours)
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - authData.auth_date > 86400) {
    return new Response(
      JSON.stringify({ error: 'Auth data expired' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify hash
  const isValid = verifyTelegramHash(authData);
  if (!isValid) {
    console.error('Invalid Telegram hash');
    return new Response(
      JSON.stringify({ error: 'Invalid authentication data' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Create email from telegram ID
  const email = `telegram_${authData.id}@taxi.local`;
  const password = `tg_${authData.id}_${TELEGRAM_BOT_TOKEN.slice(-10)}`;
  
  // Try to sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInData.session) {
    console.log('User signed in via Telegram');
    
    // Also save/update telegram connection
    await supabase
      .from('driver_telegram')
      .upsert({
        user_id: signInData.user.id,
        chat_id: authData.id.toString(),
        username: authData.username || null,
      }, { onConflict: 'user_id' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        session: signInData.session,
        user: signInData.user
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // If not found, create new user
  console.log('Creating new user from Telegram');
  
  const fullName = [authData.first_name, authData.last_name].filter(Boolean).join(' ');
  
  const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: fullName,
      telegram_id: authData.id,
      telegram_username: authData.username,
      avatar_url: authData.photo_url,
      is_driver: true,
    },
  });

  if (signUpError) {
    console.error('Error creating user:', signUpError);
    return new Response(
      JSON.stringify({ error: 'Failed to create user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Sign in the new user
  const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (newSignInError || !newSignIn.session) {
    console.error('Error signing in new user:', newSignInError);
    return new Response(
      JSON.stringify({ error: 'Failed to sign in new user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Save telegram connection
  await supabase
    .from('driver_telegram')
    .upsert({
      user_id: newSignIn.user.id,
      chat_id: authData.id.toString(),
      username: authData.username || null,
    }, { onConflict: 'user_id' });

  return new Response(
    JSON.stringify({ 
      success: true, 
      session: newSignIn.session,
      user: newSignIn.user,
      isNewUser: true
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStartCommand(chatId: string, startParam?: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Telegram not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const appUrl = Deno.env.get('APP_URL') || 'https://taxigo.uz';
  
  const message = `
🚖 *TaxiGo* ga xush kelibsiz!

Ilovamizga kirish uchun quyidagi tugmani bosing:
  `.trim();

  const keyboard = {
    inline_keyboard: [
      [{ text: '🚀 Ilovaga kirish', url: `${appUrl}/auth?telegram_login=true&chat_id=${chatId}` }]
    ]
  };

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }),
  });

  const result = await response.json();
  console.log('Start command response:', result);

  return new Response(
    JSON.stringify({ success: result.ok }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
