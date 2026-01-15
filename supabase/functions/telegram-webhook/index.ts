import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8493109056:AAG6PkzIneCyo3O6Gwt58T8kkZycoAo-pJk';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://taxigouz.netlify.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle webhook setup
  const url = new URL(req.url);
  if (url.searchParams.get('setup') === 'true') {
    return await setupWebhook();
  }

  try {
    const update = await req.json();
    console.log('Telegram update:', JSON.stringify(update));

    // Handle /start command
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const firstName = update.message.from.first_name || '';
      await sendWelcomeMessage(chatId, firstName);
    }
    
    // Handle /search command
    else if (update.message?.text?.startsWith('/search') || update.message?.text?.startsWith('/qidirish')) {
      const chatId = update.message.chat.id;
      await sendMessage(chatId, `
🔍 *SAYOHAT QIDIRISH*

Saytimizda sayohatlarni qidiring:
${APP_URL}/search

Yoki quyidagi tugmani bosing:
      `.trim(), {
        inline_keyboard: [
          [{ text: '🔍 SAYTDA QIDIRISH', url: `${APP_URL}/search` }],
          [{ text: '🏠 BOSH SAHIFA', url: APP_URL }],
        ]
      });
    }
    
    // Handle /help command
    else if (update.message?.text?.startsWith('/help') || update.message?.text?.startsWith('/yordam')) {
      const chatId = update.message.chat.id;
      await sendHelpMessage(chatId);
    }
    
    // Handle any other message
    else if (update.message?.text) {
      const chatId = update.message.chat.id;
      await sendMessage(chatId, `
ℹ️ Quyidagi buyruqlardan foydalaning:

/start - Botni boshlash
/search - Sayohat qidirish
/help - Yordam

Yoki saytimizga tashrif buyuring:
${APP_URL}
      `.trim());
    }

    // Handle callback queries
    if (update.callback_query) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function setupWebhook() {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
  
  console.log('Setting up webhook:', webhookUrl);
  
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const result = await response.json();
  console.log('Webhook setup result:', result);
  
  // Set bot commands
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: "Botni boshlash" },
        { command: 'search', description: "Sayohat qidirish" },
        { command: 'help', description: "Yordam" },
      ]
    }),
  });

  return new Response(JSON.stringify({ 
    message: 'Webhook setup complete',
    webhook_url: webhookUrl,
    result 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendWelcomeMessage(chatId: number, firstName: string) {
  const message = `
👋 *Salom, ${firstName}!*

🚖 *TaxiGo* - Surxondaryo taksi xizmati

Saytimiz orqali:
• 🔍 Sayohatlarni qidiring
• 🎫 Joylarni band qiling
• 🚗 Haydovchi sifatida sayohat qo'shing

Boshlash uchun quyidagi tugmalardan birini tanlang:
  `.trim();
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '🔍 SAYOHAT QIDIRISH', url: `${APP_URL}/search` }],
      [{ text: '🚗 HAYDOVCHI SIFATIDA KIRISH', url: `${APP_URL}/auth` }],
      [{ text: '🌐 SAYTGA O\'TISH', url: APP_URL }],
    ]
  };
  
  await sendMessage(chatId, message, keyboard);
}

async function sendHelpMessage(chatId: number) {
  const message = `
❓ *YORDAM*

*Buyruqlar:*
/start - Botni boshlash
/search - Sayohat qidirish
/help - Yordam

*Saytda:*
• Sayohatlarni qidiring va band qiling
• Haydovchi sifatida sayohat qo'shing
• O'z bronlaringizni boshqaring

*Bog'lanish:*
Saytimiz: ${APP_URL}
  `.trim();
  
  await sendMessage(chatId, message, {
    inline_keyboard: [
      [{ text: '🌐 SAYTGA O\'TISH', url: APP_URL }],
    ]
  });
}

async function sendMessage(chatId: number, text: string, keyboard?: { inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> }) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
  };
  
  if (keyboard) {
    body.reply_markup = keyboard;
  }
  
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
