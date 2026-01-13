import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Store user states for multi-step flows
const userStates: Record<string, { step: string; data: Record<string, unknown> }> = {};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle webhook setup request
  const url = new URL(req.url);
  if (url.searchParams.get('setup') === 'true') {
    return await setupWebhook();
  }

  try {
    const update = await req.json();
    console.log('Telegram webhook update:', JSON.stringify(update));

    // Handle /start command
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const firstName = update.message.from.first_name || '';
      const lastName = update.message.from.last_name || '';
      const username = update.message.from.username || '';
      
      await sendWelcomeMessage(chatId, userId, firstName, lastName, username);
    }
    
    // Handle /search command
    else if (update.message?.text?.startsWith('/search') || update.message?.text?.startsWith('/qidirish')) {
      const chatId = update.message.chat.id;
      await startSearchFlow(chatId);
    }
    
    // Handle /mytrips command
    else if (update.message?.text?.startsWith('/mytrips') || update.message?.text?.startsWith('/sayohatlarim')) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      await showUserTrips(chatId, userId);
    }
    
    // Handle /help command
    else if (update.message?.text?.startsWith('/help') || update.message?.text?.startsWith('/yordam')) {
      const chatId = update.message.chat.id;
      await sendHelpMessage(chatId);
    }
    
    // Handle /add command (driver adds trip)
    else if (update.message?.text?.startsWith('/add') || update.message?.text?.startsWith('/qoshish')) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const firstName = update.message.from.first_name || '';
      await startAddTripFlow(chatId, userId, firstName);
    }
    
    // Handle contact shared (phone number)
    else if (update.message?.contact) {
      const chatId = update.message.chat.id;
      const contact = update.message.contact;
      const fromUser = update.message.from;
      await handleContactShared(chatId, contact, fromUser);
    }
    
    // Handle text messages (for multi-step flows)
    else if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      await handleTextMessage(chatId, text);
    }

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      const chatId = update.callback_query.message.chat.id;
      const messageId = update.callback_query.message.message_id;
      const userId = update.callback_query.from.id;
      const firstName = update.callback_query.from.first_name || '';
      
      console.log('Callback query:', callbackData);
      
      // Answer callback to remove loading state
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id }),
      });
      
      await handleCallbackQuery(chatId, messageId, callbackData, userId, firstName);
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
  
  // Set webhook
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
        { command: 'start', description: 'Botni ishga tushirish' },
        { command: 'search', description: '🔍 Sayohat qidirish' },
        { command: 'add', description: '➕ Sayohat qo\'shish (Haydovchi)' },
        { command: 'mytrips', description: '🚗 Mening sayohatlarim' },
        { command: 'help', description: '❓ Yordam' },
      ]
    }),
  });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendWelcomeMessage(
  chatId: number, 
  telegramUserId: number, 
  firstName: string, 
  lastName: string, 
  username: string
) {
  const appUrl = Deno.env.get('APP_URL') || 'https://taxigo.uz';
  
  // Check if user already registered
  const email = `telegram_${telegramUserId}@taxi.local`;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);
  
  if (existingUser) {
    // User already registered
    const message = `
👋 *Salom, ${firstName}!*

Siz allaqachon ro'yxatdan o'tgansiz ✅

🚖 *TaxiGo* botida quyidagi imkoniyatlar mavjud:
• 🔍 Sayohatlarni qidirish
• 🎫 Joylarni band qilish
• 🚗 O'z sayohatlaringizni boshqarish

*Buyruqlar:*
/search - Sayohat qidirish
/mytrips - Mening sayohatlarim
/help - Yordam
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔍 Sayohat qidirish', callback_data: 'search_start' }],
        [{ text: '🚗 Sayohat qo\'shish (Haydovchi)', url: `${appUrl}/driver` }],
        [{ text: '🚀 Ilovaga kirish', url: `${appUrl}/auth?telegram_login=true&chat_id=${chatId}&user_id=${telegramUserId}` }],
      ]
    };
    
    await sendMessage(chatId, message, keyboard);
  } else {
    // New user - ask to share phone
    const message = `
👋 *Salom, ${firstName}!*

🚖 *TaxiGo* botiga xush kelibsiz!

Ro'yxatdan o'tish uchun telefon raqamingizni ulashing. 
Bu orqali siz:
• 🔍 Sayohatlarni qidirishingiz
• 🎫 Joylarni band qilishingiz
• 🚗 Haydovchi sifatida sayohat qo'shishingiz mumkin

📱 Quyidagi tugmani bosib telefon raqamingizni ulashing:
    `.trim();
    
    // Reply keyboard for sharing contact
    const replyKeyboard = {
      keyboard: [
        [{ text: '📱 Telefon raqamni ulashish', request_contact: true }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    };
    
    await sendMessageWithReplyKeyboard(chatId, message, replyKeyboard);
  }
}

async function handleContactShared(
  chatId: number, 
  contact: { phone_number: string; first_name: string; last_name?: string; user_id: number },
  fromUser: { id: number; first_name: string; last_name?: string; username?: string }
) {
  const appUrl = Deno.env.get('APP_URL') || 'https://taxigo.uz';
  
  // Verify that the contact belongs to the user sending the message
  if (contact.user_id !== fromUser.id) {
    await sendMessage(chatId, '❌ Faqat o\'zingizning telefon raqamingizni ulashishingiz mumkin.');
    return;
  }
  
  const phone = contact.phone_number;
  const firstName = contact.first_name || fromUser.first_name;
  const lastName = contact.last_name || fromUser.last_name || '';
  const username = fromUser.username || '';
  const telegramUserId = fromUser.id;
  
  // Create user in Supabase
  const email = `telegram_${telegramUserId}@taxi.local`;
  const password = `tg_${telegramUserId}_${TELEGRAM_BOT_TOKEN.slice(-10)}`;
  
  // Check if user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);
  
  if (existingUser) {
    // User already exists - update phone if needed
    await supabase.auth.admin.updateUserById(existingUser.id, {
      phone: phone,
      user_metadata: {
        ...existingUser.user_metadata,
        phone: phone,
        telegram_chat_id: chatId.toString()
      }
    });
    
    // Update driver_telegram
    await supabase
      .from('driver_telegram')
      .upsert({
        user_id: existingUser.id,
        chat_id: chatId.toString(),
        username: username || null,
      }, { onConflict: 'user_id' });
    
    const message = `
✅ *Telefon raqam yangilandi!*

📞 *Raqam:* ${phone}
👤 *Ism:* ${firstName} ${lastName}

Endi siz barcha imkoniyatlardan foydalanishingiz mumkin!
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔍 Sayohat qidirish', callback_data: 'search_start' }],
        [{ text: '🚗 Sayohat qo\'shish (Haydovchi)', url: `${appUrl}/driver` }],
      ]
    };
    
    // Remove the reply keyboard and send message
    await sendMessageRemoveKeyboard(chatId, message, keyboard);
  } else {
    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone: phone,
      user_metadata: {
        name: `${firstName} ${lastName}`.trim(),
        phone: phone,
        telegram_id: telegramUserId,
        telegram_username: username,
        telegram_chat_id: chatId.toString(),
        is_driver: false,
      },
    });
    
    if (createError) {
      console.error('Error creating user:', createError);
      await sendMessage(chatId, '❌ Xatolik yuz berdi. Keyinroq qayta urinib ko\'ring.');
      return;
    }
    
    // Save telegram connection
    await supabase
      .from('driver_telegram')
      .upsert({
        user_id: newUser.user.id,
        chat_id: chatId.toString(),
        username: username || null,
      }, { onConflict: 'user_id' });
    
    const message = `
✅ *Ro'yxatdan o'tish muvaffaqiyatli!*

📞 *Raqam:* ${phone}
👤 *Ism:* ${firstName} ${lastName}

Tabriklaymiz! Endi siz:
• 🔍 Sayohatlarni qidirishingiz
• 🎫 Joylarni band qilishingiz  
• 🚗 Haydovchi sifatida sayohat qo'shishingiz mumkin

*Buyruqlar:*
/search - Sayohat qidirish
/mytrips - Mening sayohatlarim
/help - Yordam
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔍 Sayohat qidirish', callback_data: 'search_start' }],
        [{ text: '🚗 Sayohat qo\'shish (Haydovchi)', url: `${appUrl}/driver` }],
        [{ text: '🚀 Ilovaga kirish', url: `${appUrl}/auth?telegram_login=true&chat_id=${chatId}&user_id=${telegramUserId}` }],
      ]
    };
    
    // Remove the reply keyboard and send message
    await sendMessageRemoveKeyboard(chatId, message, keyboard);
  }
}

async function sendHelpMessage(chatId: number) {
  const message = `
❓ *Yordam*

*Asosiy buyruqlar:*
/search - Sayohatlarni qidirish
/mytrips - Sizning bronlaringiz
/help - Ushbu yordam xabari

*Qanday ishlaydi:*
1️⃣ /search buyrug'ini yuboring
2️⃣ Qayerdan ketishni tanlang
3️⃣ Qayerga borishni tanlang
4️⃣ Mavjud sayohatlardan birini tanlang
5️⃣ Joy band qiling!

Savollaringiz bo'lsa, @taxigo_support ga yozing.
  `.trim();
  
  await sendMessage(chatId, message);
}

// Surxondaryo tumanlari
const SURXONDARYO_DISTRICTS = [
  'Termiz', 'Denov', 'Sherobod', 'Boysun', "Jarqo'rg'on", 
  "Qumqo'rg'on", 'Angor', 'Oltinsoy', 'Sariosiyo', 'Qiziriq', 
  'Muzrobod', "Sho'rchi", 'Uzun', 'Bandixon'
];

// Viloyat markazlari
const REGIONAL_CENTERS = [
  'Toshkent', 'Samarqand', 'Buxoro', 'Andijon', "Farg'ona",
  'Namangan', 'Qarshi', 'Navoiy', 'Jizzax', 'Guliston', 'Nukus', 'Urganch'
];

// All locations combined
const ALL_DISTRICTS = [...SURXONDARYO_DISTRICTS, ...REGIONAL_CENTERS];

async function startSearchFlow(chatId: number) {
  // Show districts and regional centers grouped
  const keyboard = {
    inline_keyboard: [
      // Header for Surxondaryo
      [{ text: '📍 SURXONDARYO TUMANLARI', callback_data: 'header_surxon' }],
      ...SURXONDARYO_DISTRICTS.slice(0, 7).map(district => ([
        { text: `📍 ${district}`, callback_data: `from_${district}` }
      ])),
      [{ text: '➡️ Ko\'proq tumanlar...', callback_data: 'more_districts' }],
      // Header for regional centers
      [{ text: '🏙️ VILOYAT MARKAZLARI', callback_data: 'header_regions' }],
      ...REGIONAL_CENTERS.slice(0, 6).map(center => ([
        { text: `🏙️ ${center}`, callback_data: `from_${center}` }
      ])),
      [{ text: '➡️ Ko\'proq shaharlar...', callback_data: 'more_regions' }]
    ]
  };
  
  await sendMessage(chatId, '🔍 *Sayohat qidirish*\n\n📍 Surxondaryo tumanlari va 🏙️ Viloyat markazlaridan tanlang:\n\nQayerdan ketmoqchisiz?', keyboard);
}

// Vehicle models for driver
const VEHICLE_MODELS = [
  'Chevrolet Cobalt', 'Chevrolet Nexia', 'Chevrolet Lacetti', 
  'Chevrolet Gentra', 'Chevrolet Malibu', 'Daewoo Matiz', 'Daewoo Nexia'
];

const VEHICLE_COLORS = ['Oq', 'Qora', 'Kumush', 'Kulrang', 'Qizil', "Ko'k", 'Yashil'];

// Helper function to show date selection
async function showDateSelection(chatId: number, messageId: number, state: { step: string; data: Record<string, unknown> }) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = i === 0 ? 'Bugun' : i === 1 ? 'Ertaga' : date.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' });
    dates.push({ text: dayName, data: dateStr });
  }
  
  const keyboard = {
    inline_keyboard: [
      ...dates.map(d => ([{ text: d.text, callback_data: `add_date_${d.data}` }])),
      [{ text: '❌ Bekor qilish', callback_data: 'cancel_add' }]
    ]
  };
  
  const pickups = (state.data.pickup_districts as string[]) || [];
  const pickupsList = pickups.length > 0 ? `\n📍 *Qo'shimcha tumanlar:* ${pickups.join(', ')}` : '';
  
  await editMessage(chatId, messageId, `➕ *Yangi sayohat*\n\n📍 *Qayerdan:* ${state.data.from_district}${pickupsList}\n🏙️ *Qayerga:* ${state.data.to_district}\n\n📅 Qachon ketasiz?`, keyboard);
}

async function startAddTripFlow(chatId: number, telegramUserId: number, firstName: string) {
  // Check if user is registered
  const email = `telegram_${telegramUserId}@taxi.local`;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);
  
  if (!existingUser) {
    await sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!\n\n/start buyrug\'ini yuboring va telefon raqamingizni ulashing.');
    return;
  }
  
  // Start the add trip flow
  userStates[chatId] = { 
    step: 'add_from', 
    data: { 
      user_id: existingUser.id,
      driver_name: existingUser.user_metadata?.name || firstName,
      phone: existingUser.user_metadata?.phone || '',
      telegram_chat_id: chatId.toString()
    } 
  };
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '📍 SURXONDARYO TUMANLARI', callback_data: 'header_surxon' }],
      ...SURXONDARYO_DISTRICTS.map(district => ([
        { text: `📍 ${district}`, callback_data: `add_from_${district}` }
      ])),
      [{ text: '🏙️ VILOYAT MARKAZLARI', callback_data: 'header_regions' }],
      ...REGIONAL_CENTERS.map(center => ([
        { text: `🏙️ ${center}`, callback_data: `add_from_${center}` }
      ])),
      [{ text: '❌ Bekor qilish', callback_data: 'cancel_add' }]
    ]
  };
  
  await sendMessage(chatId, '➕ *Yangi sayohat qo\'shish*\n\n📍 Surxondaryo tumanlari va 🏙️ Viloyat markazlaridan tanlang:\n\nQayerdan ketasiz?', keyboard);
}

async function handleCallbackQuery(
  chatId: number, 
  messageId: number, 
  callbackData: string,
  userId: number,
  firstName: string
) {
  // Search start
  if (callbackData === 'search_start') {
    await startSearchFlow(chatId);
    return;
  }
  
  // Show more districts
  if (callbackData === 'more_districts') {
    const keyboard = {
      inline_keyboard: [
        ...SURXONDARYO_DISTRICTS.slice(7).map(district => ([
          { text: `📍 ${district}`, callback_data: `from_${district}` }
        ])),
        [{ text: '⬅️ Orqaga', callback_data: 'search_start' }]
      ]
    };
    await editMessage(chatId, messageId, '🔍 *Qo\'shimcha tumanlar*\n\nQayerdan ketmoqchisiz?', keyboard);
    return;
  }
  
  // Show more regional centers
  if (callbackData === 'more_regions') {
    const keyboard = {
      inline_keyboard: [
        ...REGIONAL_CENTERS.slice(6).map(center => ([
          { text: `🏙️ ${center}`, callback_data: `from_${center}` }
        ])),
        [{ text: '⬅️ Orqaga', callback_data: 'search_start' }]
      ]
    };
    await editMessage(chatId, messageId, '🔍 *Qo\'shimcha viloyat markazlari*\n\nQayerdan ketmoqchisiz?', keyboard);
    return;
  }
  
  // Header buttons (do nothing)
  if (callbackData.startsWith('header_')) {
    return;
  }
  
  // From district selected
  if (callbackData.startsWith('from_')) {
    const fromDistrict = callbackData.replace('from_', '');
    userStates[chatId] = { step: 'select_to', data: { from_district: fromDistrict } };
    
    // Check if from is regional center or district
    const isFromRegional = REGIONAL_CENTERS.includes(fromDistrict);
    
    // Show appropriate destinations
    const keyboard = {
      inline_keyboard: [
        [{ text: '📍 SURXONDARYO TUMANLARI', callback_data: 'header_surxon' }],
        ...SURXONDARYO_DISTRICTS.filter(d => d !== fromDistrict).map(district => ([
          { text: `📍 ${district}`, callback_data: `to_${district}` }
        ])),
        [{ text: '🏙️ VILOYAT MARKAZLARI', callback_data: 'header_regions' }],
        ...REGIONAL_CENTERS.filter(c => c !== fromDistrict).map(center => ([
          { text: `🏙️ ${center}`, callback_data: `to_${center}` }
        ])),
        [{ text: '⬅️ Orqaga', callback_data: 'search_start' }]
      ]
    };
    
    const icon = isFromRegional ? '🏙️' : '📍';
    await editMessage(chatId, messageId, `🔍 *Sayohat qidirish*\n\n${icon} *Qayerdan:* ${fromDistrict}\n\nQayerga ketmoqchisiz?`, keyboard);
    return;
  }
  
  // To district selected - show trips
  if (callbackData.startsWith('to_')) {
    const toDistrict = callbackData.replace('to_', '');
    const fromDistrict = userStates[chatId]?.data?.from_district as string;
    
    if (!fromDistrict) {
      await startSearchFlow(chatId);
      return;
    }
    
    // Get trips for this route - including trips with pickup_districts that include fromDistrict
    const { data: directTrips } = await supabase
      .from('taxi_trips')
      .select('*')
      .eq('is_active', true)
      .eq('from_district', fromDistrict)
      .eq('to_district', toDistrict)
      .order('departure_date', { ascending: true })
      .limit(5);
    
    // Also get trips where fromDistrict is in pickup_districts
    const { data: pickupTrips } = await supabase
      .from('taxi_trips')
      .select('*')
      .eq('is_active', true)
      .eq('to_district', toDistrict)
      .contains('pickup_districts', [fromDistrict])
      .order('departure_date', { ascending: true })
      .limit(5);
    
    // Combine and deduplicate trips
    const allTripsMap = new Map();
    [...(directTrips || []), ...(pickupTrips || [])].forEach(trip => {
      allTripsMap.set(trip.id, trip);
    });
    const trips = Array.from(allTripsMap.values()).slice(0, 10);
    
    if (trips.length === 0) {
      const noTripsMessage = `
😔 *Sayohat topilmadi*

📍 ${fromDistrict} → ${toDistrict} yo'nalishida hozircha faol sayohatlar yo'q.

Keyinroq qayta tekshirib ko'ring yoki boshqa yo'nalish tanlang.
      `.trim();
      
      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 Qayta qidirish', callback_data: 'search_start' }],
          [{ text: '⬅️ Orqaga', callback_data: `from_${fromDistrict}` }]
        ]
      };
      
      await editMessage(chatId, messageId, noTripsMessage, keyboard);
      return;
    }
    
    const keyboard = {
      inline_keyboard: [
        ...trips.map(trip => {
          const availableSeats = trip.total_seats - trip.occupied_seats;
          const date = trip.departure_date;
          const time = trip.departure_time;
          const hasPickups = trip.pickup_districts && trip.pickup_districts.length > 0;
          const pickupIcon = hasPickups ? '🔄' : '🚗';
          return [{
            text: `${pickupIcon} ${trip.driver_name} | ${date} ${time} | ${availableSeats} joy | ${trip.price_per_seat.toLocaleString()} so'm`,
            callback_data: `trip_${trip.id}`
          }];
        }),
        [{ text: '⬅️ Orqaga', callback_data: `from_${fromDistrict}` }]
      ]
    };
    
    await editMessage(chatId, messageId, `🔍 *Topilgan sayohatlar*\n\n📍 ${fromDistrict} → ${toDistrict}\n\n🔄 = bir nechta tumandan oladi\n\nQuyidagilardan birini tanlang:`, keyboard);
    return;
  }
  
  // Trip selected - show details
  if (callbackData.startsWith('trip_')) {
    const tripId = callbackData.replace('trip_', '');
    
    const { data: trip } = await supabase
      .from('taxi_trips')
      .select('*')
      .eq('id', tripId)
      .single();
    
    if (!trip) {
      await sendMessage(chatId, '😔 Sayohat topilmadi.');
      return;
    }
    
    const availableSeats = trip.total_seats - trip.occupied_seats;
    
    const features = [];
    if (trip.has_air_conditioner) features.push('❄️ Konditsioner');
    if (trip.has_large_luggage) features.push('🧳 Katta yuk');
    if (!trip.smoking_allowed) features.push('🚭 Chekish ta\'qiqlangan');
    if (trip.for_women) features.push('👩 Ayollar uchun');
    
    // Build pickup districts info
    const pickupInfo = trip.pickup_districts && trip.pickup_districts.length > 0 
      ? `\n📍 *Qo'shimcha tumanlar:* ${trip.pickup_districts.join(', ')}` 
      : '';
    
    const message = `
🚗 *Sayohat tafsilotlari*

👤 *Haydovchi:* ${trip.driver_name}
📞 *Telefon:* ${trip.phone}

📍 *Yo'nalish:* ${trip.from_district} → ${trip.to_district}${pickupInfo}
📅 *Sana:* ${trip.departure_date}
🕐 *Vaqt:* ${trip.departure_time}

🚙 *Mashina:* ${trip.vehicle_model} (${trip.vehicle_color})
${trip.plate_number ? `🔢 *Raqam:* ${trip.plate_number}` : ''}

💺 *Bo'sh joylar:* ${availableSeats} ta
💰 *Narx:* ${trip.price_per_seat.toLocaleString()} so'm

${features.length > 0 ? `*Qulayliklar:* ${features.join(' | ')}` : ''}
    `.trim();
    
    userStates[chatId] = { step: 'booking', data: { trip_id: tripId, trip } };
    
    const keyboard = {
      inline_keyboard: []
    } as { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };
    
    // Add seat selection buttons (up to available seats, max 4)
    const seatButtons = [];
    for (let i = 1; i <= Math.min(availableSeats, 4); i++) {
      seatButtons.push({ text: `${i} joy`, callback_data: `book_${tripId}_${i}` });
    }
    if (seatButtons.length > 0) {
      keyboard.inline_keyboard.push(seatButtons);
    }
    
    keyboard.inline_keyboard.push([
      { text: '📞 Haydovchiga qo\'ng\'iroq', callback_data: `call_${trip.phone}` }
    ]);
    keyboard.inline_keyboard.push([
      { text: '⬅️ Orqaga', callback_data: 'search_start' }
    ]);
    
    await editMessage(chatId, messageId, message, keyboard);
    return;
  }
  
  // Book seats
  if (callbackData.startsWith('book_')) {
    const parts = callbackData.split('_');
    const tripId = parts[1];
    const seats = parseInt(parts[2]);
    
    userStates[chatId] = { 
      step: 'enter_name', 
      data: { trip_id: tripId, seats, user_id: userId, first_name: firstName } 
    };
    
    await editMessage(chatId, messageId, `📝 *Bron qilish*\n\n${seats} ta joy band qilyapsiz.\n\nIsmingizni kiriting:`);
    return;
  }
  
  // Call driver - show phone
  if (callbackData.startsWith('call_')) {
    const phone = callbackData.replace('call_', '');
    await sendMessage(chatId, `📞 Haydovchi telefon raqami: ${phone}\n\nQo'ng'iroq qilishingiz mumkin!`);
    return;
  }
  
  // My bookings
  if (callbackData === 'my_bookings') {
    await showUserBookings(chatId, userId);
    return;
  }
  
  // Cancel booking
  if (callbackData.startsWith('cancel_booking_')) {
    const bookingId = callbackData.replace('cancel_booking_', '');
    await cancelBooking(chatId, bookingId, messageId);
    return;
  }
  
  // Driver confirms booking
  if (callbackData.startsWith('confirm_')) {
    const bookingId = callbackData.replace('confirm_', '');
    await handleDriverConfirm(chatId, messageId, bookingId);
    return;
  }
  
  // Driver rejects booking
  if (callbackData.startsWith('reject_')) {
    const bookingId = callbackData.replace('reject_', '');
    await handleDriverReject(chatId, messageId, bookingId);
    return;
  }
  
  // Add trip - from district selected
  if (callbackData.startsWith('add_from_')) {
    const fromDistrict = callbackData.replace('add_from_', '');
    const state = userStates[chatId];
    if (!state || !state.data.user_id) {
      await startAddTripFlow(chatId, userId, firstName);
      return;
    }
    state.data.from_district = fromDistrict;
    state.step = 'add_to';
    
    const isFromRegional = REGIONAL_CENTERS.includes(fromDistrict);
    const icon = isFromRegional ? '🏙️' : '📍';
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '📍 SURXONDARYO TUMANLARI', callback_data: 'header_surxon' }],
        ...SURXONDARYO_DISTRICTS.filter(d => d !== fromDistrict).map(district => ([
          { text: `📍 ${district}`, callback_data: `add_to_${district}` }
        ])),
        [{ text: '🏙️ VILOYAT MARKAZLARI', callback_data: 'header_regions' }],
        ...REGIONAL_CENTERS.filter(c => c !== fromDistrict).map(center => ([
          { text: `🏙️ ${center}`, callback_data: `add_to_${center}` }
        ])),
        [{ text: '❌ Bekor qilish', callback_data: 'cancel_add' }]
      ]
    };
    
    await editMessage(chatId, messageId, `➕ *Yangi sayohat*\n\n${icon} *Qayerdan:* ${fromDistrict}\n\nQayerga ketasiz?`, keyboard);
    return;
  }
  
  // Add trip - to district selected - now ask for additional pickups
  if (callbackData.startsWith('add_to_')) {
    const toDistrict = callbackData.replace('add_to_', '');
    const state = userStates[chatId];
    if (!state) return;
    
    state.data.to_district = toDistrict;
    state.data.pickup_districts = []; // Initialize empty array for additional pickups
    state.step = 'add_pickups';
    
    // Check if going to a regional center - offer multi-pickup option
    const isToRegional = REGIONAL_CENTERS.includes(toDistrict);
    
    if (isToRegional) {
      // Show option to add more pickup points
      const fromDistrict = state.data.from_district as string;
      const availablePickups = SURXONDARYO_DISTRICTS.filter(d => d !== fromDistrict);
      
      const keyboard = {
        inline_keyboard: [
          [{ text: '⏭️ Qo\'shimcha tumanlar yo\'q - davom etish', callback_data: 'skip_pickups' }],
          [{ text: '📍 QO\'SHIMCHA TUMANLAR TANLASH', callback_data: 'header_pickups' }],
          ...availablePickups.map(district => ([
            { text: `📍 ${district}`, callback_data: `add_pickup_${district}` }
          ])),
          [{ text: '❌ Bekor qilish', callback_data: 'cancel_add' }]
        ]
      };
      
      await editMessage(chatId, messageId, `➕ *Yangi sayohat*\n\n📍 *Qayerdan:* ${fromDistrict}\n🏙️ *Qayerga:* ${toDistrict}\n\n📍 *Qo'shimcha tumanlardan yo'lovchi olasizmi?*\n\nBir nechta tuman tanlashingiz mumkin yoki "davom etish" tugmasini bosing.`, keyboard);
    } else {
      // Not going to regional center - skip to date selection
      state.step = 'add_date';
      await showDateSelection(chatId, messageId, state);
    }
    return;
  }
  
  // Add pickup district (multi-select)
  if (callbackData.startsWith('add_pickup_')) {
    const pickupDistrict = callbackData.replace('add_pickup_', '');
    const state = userStates[chatId];
    if (!state) return;
    
    // Toggle the pickup district
    const pickups = (state.data.pickup_districts as string[]) || [];
    const index = pickups.indexOf(pickupDistrict);
    if (index === -1) {
      pickups.push(pickupDistrict);
    } else {
      pickups.splice(index, 1);
    }
    state.data.pickup_districts = pickups;
    
    const fromDistrict = state.data.from_district as string;
    const toDistrict = state.data.to_district as string;
    const availablePickups = SURXONDARYO_DISTRICTS.filter(d => d !== fromDistrict);
    
    const keyboard = {
      inline_keyboard: [
        [{ text: `✅ Tayyor (${pickups.length} ta tuman tanlandi)`, callback_data: 'skip_pickups' }],
        [{ text: '📍 QO\'SHIMCHA TUMANLAR', callback_data: 'header_pickups' }],
        ...availablePickups.map(district => {
          const isSelected = pickups.includes(district);
          return [{ 
            text: `${isSelected ? '✅' : '📍'} ${district}`, 
            callback_data: `add_pickup_${district}` 
          }];
        }),
        [{ text: '❌ Bekor qilish', callback_data: 'cancel_add' }]
      ]
    };
    
    const pickupsList = pickups.length > 0 ? `\n📍 *Qo'shimcha:* ${pickups.join(', ')}` : '';
    await editMessage(chatId, messageId, `➕ *Yangi sayohat*\n\n📍 *Qayerdan:* ${fromDistrict}${pickupsList}\n🏙️ *Qayerga:* ${toDistrict}\n\n📍 *Yana tumanlar tanlang yoki "Tayyor" tugmasini bosing*`, keyboard);
    return;
  }
  
  // Skip pickups / finish pickup selection
  if (callbackData === 'skip_pickups') {
    const state = userStates[chatId];
    if (!state) return;
    
    state.step = 'add_date';
    await showDateSelection(chatId, messageId, state);
    return;
  }
  
  // Add trip - date selected
  if (callbackData.startsWith('add_date_')) {
    const date = callbackData.replace('add_date_', '');
    const state = userStates[chatId];
    if (!state) return;
    
    state.data.departure_date = date;
    state.step = 'add_time';
    
    const times = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    
    const keyboard = {
      inline_keyboard: [
        times.slice(0, 5).map(t => ({ text: t, callback_data: `add_time_${t}` })),
        times.slice(5, 10).map(t => ({ text: t, callback_data: `add_time_${t}` })),
        times.slice(10, 15).map(t => ({ text: t, callback_data: `add_time_${t}` })),
        [{ text: '❌ Bekor qilish', callback_data: 'cancel_add' }]
      ]
    };
    
    await editMessage(chatId, messageId, `➕ *Yangi sayohat*\n\n📍 ${state.data.from_district} → ${state.data.to_district}\n📅 ${date}\n\n🕐 Soat nechida?`, keyboard);
    return;
  }
  
  // Add trip - time selected
  if (callbackData.startsWith('add_time_')) {
    const time = callbackData.replace('add_time_', '');
    const state = userStates[chatId];
    if (!state) return;
    
    state.data.departure_time = time;
    state.step = 'add_price';
    
    await editMessage(chatId, messageId, `➕ *Yangi sayohat*\n\n📍 ${state.data.from_district} → ${state.data.to_district}\n📅 ${state.data.departure_date} | ${time}\n\n💰 Bir joy narxini kiriting (so'mda):\n\nMasalan: 30000`);
    return;
  }
  
  // Add trip - vehicle model selected
  if (callbackData.startsWith('add_model_')) {
    const model = callbackData.replace('add_model_', '');
    const state = userStates[chatId];
    if (!state) return;
    
    state.data.vehicle_model = model;
    state.step = 'add_color';
    
    const keyboard = {
      inline_keyboard: [
        VEHICLE_COLORS.slice(0, 4).map(c => ({ text: c, callback_data: `add_color_${c}` })),
        VEHICLE_COLORS.slice(4).map(c => ({ text: c, callback_data: `add_color_${c}` })),
        [{ text: '❌ Bekor qilish', callback_data: 'cancel_add' }]
      ]
    };
    
    await editMessage(chatId, messageId, `➕ *Yangi sayohat*\n\n🚙 *Mashina:* ${model}\n\n🎨 Rangini tanlang:`, keyboard);
    return;
  }
  
  // Add trip - color selected
  if (callbackData.startsWith('add_color_')) {
    const color = callbackData.replace('add_color_', '');
    const state = userStates[chatId];
    if (!state) return;
    
    state.data.vehicle_color = color;
    state.step = 'add_seats';
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '1 joy', callback_data: 'add_seats_1' },
          { text: '2 joy', callback_data: 'add_seats_2' },
          { text: '3 joy', callback_data: 'add_seats_3' },
          { text: '4 joy', callback_data: 'add_seats_4' }
        ],
        [{ text: '❌ Bekor qilish', callback_data: 'cancel_add' }]
      ]
    };
    
    await editMessage(chatId, messageId, `➕ *Yangi sayohat*\n\n🚙 ${state.data.vehicle_model} (${color})\n\n💺 Nechta joy bor?`, keyboard);
    return;
  }
  
  // Add trip - seats selected - create trip
  if (callbackData.startsWith('add_seats_')) {
    const seats = parseInt(callbackData.replace('add_seats_', ''));
    const state = userStates[chatId];
    if (!state) return;
    
    const pickupDistricts = (state.data.pickup_districts as string[]) || [];
    
    // Create the trip with pickup_districts
    const { data: trip, error } = await supabase
      .from('taxi_trips')
      .insert({
        user_id: state.data.user_id,
        driver_name: state.data.driver_name,
        phone: state.data.phone,
        from_district: state.data.from_district,
        to_district: state.data.to_district,
        departure_date: state.data.departure_date,
        departure_time: state.data.departure_time,
        price_per_seat: state.data.price_per_seat,
        vehicle_model: state.data.vehicle_model,
        vehicle_color: state.data.vehicle_color,
        total_seats: seats,
        telegram_chat_id: state.data.telegram_chat_id,
        pickup_districts: pickupDistricts.length > 0 ? pickupDistricts : null,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating trip:', error);
      await sendMessage(chatId, '❌ Xatolik yuz berdi. Qayta urinib ko\'ring.');
      delete userStates[chatId];
      return;
    }
    
    const pickupsList = pickupDistricts.length > 0 ? `\n📍 *Qo'shimcha tumanlar:* ${pickupDistricts.join(', ')}` : '';
    
    const successMessage = `
✅ *Sayohat muvaffaqiyatli qo'shildi!*

📍 *Yo'nalish:* ${state.data.from_district} → ${state.data.to_district}${pickupsList}
📅 *Sana:* ${state.data.departure_date}
🕐 *Vaqt:* ${state.data.departure_time}

🚙 *Mashina:* ${state.data.vehicle_model} (${state.data.vehicle_color})
💺 *Joylar:* ${seats} ta
💰 *Narx:* ${state.data.price_per_seat?.toLocaleString()} so'm

Yo'lovchilar sizga bron so'rovi yuborganda xabar olasiz!
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '➕ Yana sayohat qo\'shish', callback_data: 'add_new_trip' }],
        [{ text: '🔍 Sayohat qidirish', callback_data: 'search_start' }]
      ]
    };
    
    await editMessage(chatId, messageId, successMessage, keyboard);
    delete userStates[chatId];
    return;
  }
  
  // Cancel add trip
  if (callbackData === 'cancel_add') {
    delete userStates[chatId];
    await editMessage(chatId, messageId, '❌ Sayohat qo\'shish bekor qilindi.');
    return;
  }
  
  // Add new trip (restart)
  if (callbackData === 'add_new_trip') {
    await startAddTripFlow(chatId, userId, firstName);
    return;
  }
}

async function handleTextMessage(chatId: number, text: string) {
  const state = userStates[chatId];
  
  if (!state) {
    // No active flow, show help
    await sendMessage(chatId, 'Buyruqlardan birini tanlang:\n\n/search - Sayohat qidirish\n/add - Sayohat qo\'shish\n/mytrips - Bronlarim\n/help - Yordam');
    return;
  }
  
  // Handle price input for add trip flow
  if (state.step === 'add_price') {
    const price = parseInt(text.replace(/\D/g, ''));
    
    if (isNaN(price) || price < 1000 || price > 1000000) {
      await sendMessage(chatId, '❌ Narx noto\'g\'ri. 1,000 dan 1,000,000 gacha so\'m kiriting:\n\nMasalan: 30000');
      return;
    }
    
    state.data.price_per_seat = price;
    state.step = 'add_model';
    
    const keyboard = {
      inline_keyboard: [
        ...VEHICLE_MODELS.slice(0, 4).map(m => ([{ text: m, callback_data: `add_model_${m}` }])),
        ...VEHICLE_MODELS.slice(4).map(m => ([{ text: m, callback_data: `add_model_${m}` }])),
        [{ text: '❌ Bekor qilish', callback_data: 'cancel_add' }]
      ]
    };
    
    await sendMessage(chatId, `➕ *Yangi sayohat*\n\n💰 *Narx:* ${price.toLocaleString()} so'm\n\n🚙 Mashina modelini tanlang:`, keyboard);
    return;
  }
  
  if (state.step === 'enter_name') {
    state.data.passenger_name = text;
    state.step = 'enter_phone';
    await sendMessage(chatId, `✅ Ism: ${text}\n\n📞 Telefon raqamingizni kiriting:\n(masalan: +998901234567)`);
    return;
  }
  
  if (state.step === 'enter_phone') {
    const phone = text.replace(/\s/g, '');
    
    // Validate phone
    if (!phone.match(/^\+?[0-9]{9,15}$/)) {
      await sendMessage(chatId, '❌ Telefon raqam noto\'g\'ri. Qaytadan kiriting:\n(masalan: +998901234567)');
      return;
    }
    
    state.data.passenger_phone = phone;
    
    // Create booking with passenger telegram chat_id
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        trip_id: state.data.trip_id,
        passenger_name: state.data.passenger_name,
        passenger_phone: phone,
        seats_booked: state.data.seats,
        status: 'pending',
        passenger_telegram_chat_id: chatId.toString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Booking error:', error);
      await sendMessage(chatId, '❌ Xatolik yuz berdi. Keyinroq qayta urinib ko\'ring.');
      delete userStates[chatId];
      return;
    }
    
    // Update trip occupied seats
    const trip = state.data.trip as Record<string, unknown>;
    await supabase
      .from('taxi_trips')
      .update({ occupied_seats: (trip.occupied_seats as number) + (state.data.seats as number) })
      .eq('id', state.data.trip_id);
    
    // Get trip details for confirmation
    const { data: tripData } = await supabase
      .from('taxi_trips')
      .select('*')
      .eq('id', state.data.trip_id)
      .single();
    
    // Send confirmation
    const message = `
✅ *Bron muvaffaqiyatli yaratildi!*

📍 *Yo'nalish:* ${tripData?.from_district} → ${tripData?.to_district}
📅 *Sana:* ${tripData?.departure_date}
🕐 *Vaqt:* ${tripData?.departure_time}

👤 *Ism:* ${state.data.passenger_name}
📞 *Telefon:* ${phone}
💺 *Joylar:* ${state.data.seats} ta

👤 *Haydovchi:* ${tripData?.driver_name}
📞 *Haydovchi tel:* ${tripData?.phone}

Haydovchi siz bilan bog'lanadi. Yaxshi yo'l!
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔍 Yana qidirish', callback_data: 'search_start' }],
        [{ text: '📋 Mening bronlarim', callback_data: 'my_bookings' }]
      ]
    };
    
    await sendMessage(chatId, message, keyboard);
    
    // Notify driver via Telegram if connected
    if (tripData?.telegram_chat_id) {
      const driverMessage = `
🎫 *Yangi bron so'rovi!*

👤 *Yo'lovchi:* ${state.data.passenger_name}
📞 *Telefon:* ${phone}
💺 *Joylar:* ${state.data.seats} ta

📍 ${tripData.from_district} → ${tripData.to_district}
📅 ${tripData.departure_date} | ${tripData.departure_time}

Tasdiqlash yoki bekor qilishni tanlang:
      `.trim();
      
      const driverKeyboard = {
        inline_keyboard: [
          [
            { text: '✅ Tasdiqlash', callback_data: `confirm_${booking.id}` },
            { text: '❌ Bekor qilish', callback_data: `reject_${booking.id}` }
          ],
          [{ text: '📞 Yo\'lovchiga qo\'ng\'iroq', callback_data: `call_${phone}` }]
        ]
      };
      
      await sendMessage(parseInt(tripData.telegram_chat_id), driverMessage, driverKeyboard);
    }
    
    delete userStates[chatId];
    return;
  }
}

async function showUserTrips(chatId: number, userId: number) {
  // For now, show bookings search option
  const message = `
🚗 *Sizning sayohatlaringiz*

Bronlaringizni ko'rish uchun telefon raqamingizni kiriting:
  `.trim();
  
  userStates[chatId] = { step: 'search_bookings', data: { user_id: userId } };
  
  await sendMessage(chatId, message);
}

async function showUserBookings(chatId: number, userId: number) {
  // Show booking search by phone
  userStates[chatId] = { step: 'search_bookings', data: {} };
  await sendMessage(chatId, '📋 *Bronlaringizni ko\'rish*\n\nTelefon raqamingizni kiriting:');
}

async function cancelBooking(chatId: number, bookingId: string, messageId: number) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, taxi_trips(*)')
    .eq('id', bookingId)
    .maybeSingle();
  
  if (!booking) {
    await sendMessage(chatId, '❌ Bron topilmadi.');
    return;
  }
  
  // Update booking status
  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
  
  // Update trip seats
  await supabase
    .from('taxi_trips')
    .update({ 
      occupied_seats: Math.max(0, (booking.taxi_trips?.occupied_seats || 0) - booking.seats_booked) 
    })
    .eq('id', booking.trip_id);
  
  await sendMessage(chatId, '✅ Bron bekor qilindi.');
}

async function handleDriverConfirm(chatId: number, messageId: number, bookingId: string) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, taxi_trips(*)')
    .eq('id', bookingId)
    .maybeSingle();
  
  if (!booking) {
    await sendMessage(chatId, '❌ Bron topilmadi.');
    return;
  }
  
  if (booking.status === 'confirmed') {
    await sendMessage(chatId, '⚠️ Bu bron allaqachon tasdiqlangan.');
    return;
  }
  
  if (booking.status === 'cancelled' || booking.status === 'rejected') {
    await sendMessage(chatId, '⚠️ Bu bron allaqachon bekor qilingan.');
    return;
  }
  
  // Update booking status
  await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId);
  
  // Update the driver's message
  const confirmedMessage = `
✅ *Bron tasdiqlandi!*

👤 *Yo'lovchi:* ${booking.passenger_name}
📞 *Telefon:* ${booking.passenger_phone}
💺 *Joylar:* ${booking.seats_booked} ta

📍 ${booking.taxi_trips?.from_district} → ${booking.taxi_trips?.to_district}
📅 ${booking.taxi_trips?.departure_date} | ${booking.taxi_trips?.departure_time}

Yo'lovchi bilan bog'laning!
  `.trim();
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '📞 Yo\'lovchiga qo\'ng\'iroq', callback_data: `call_${booking.passenger_phone}` }]
    ]
  };
  
  await editMessage(chatId, messageId, confirmedMessage, keyboard);
  
  // Notify passenger via Telegram
  if (booking.passenger_telegram_chat_id) {
    const passengerMessage = `
✅ *Broningiz tasdiqlandi!*

👤 *Haydovchi:* ${booking.taxi_trips?.driver_name}
📞 *Telefon:* ${booking.taxi_trips?.phone}

📍 *Yo'nalish:* ${booking.taxi_trips?.from_district} → ${booking.taxi_trips?.to_district}
📅 *Sana:* ${booking.taxi_trips?.departure_date}
🕐 *Vaqt:* ${booking.taxi_trips?.departure_time}

🚙 *Mashina:* ${booking.taxi_trips?.vehicle_model} (${booking.taxi_trips?.vehicle_color})
${booking.taxi_trips?.plate_number ? `🔢 *Raqam:* ${booking.taxi_trips?.plate_number}` : ''}

💺 *Joylar:* ${booking.seats_booked} ta
💰 *Narx:* ${(booking.taxi_trips?.price_per_seat * booking.seats_booked).toLocaleString()} so'm

Haydovchi siz bilan bog'lanadi. Yaxshi yo'l! 🚖
    `.trim();
    
    const passengerKeyboard = {
      inline_keyboard: [
        [{ text: '📞 Haydovchiga qo\'ng\'iroq', callback_data: `call_${booking.taxi_trips?.phone}` }],
        [{ text: '🔍 Boshqa sayohat qidirish', callback_data: 'search_start' }]
      ]
    };
    
    await sendMessage(parseInt(booking.passenger_telegram_chat_id), passengerMessage, passengerKeyboard);
  }
}

async function handleDriverReject(chatId: number, messageId: number, bookingId: string) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, taxi_trips(*)')
    .eq('id', bookingId)
    .maybeSingle();
  
  if (!booking) {
    await sendMessage(chatId, '❌ Bron topilmadi.');
    return;
  }
  
  if (booking.status === 'rejected' || booking.status === 'cancelled') {
    await sendMessage(chatId, '⚠️ Bu bron allaqachon bekor qilingan.');
    return;
  }
  
  // Update booking status
  await supabase
    .from('bookings')
    .update({ status: 'rejected' })
    .eq('id', bookingId);
  
  // Return seats to trip
  await supabase
    .from('taxi_trips')
    .update({ 
      occupied_seats: Math.max(0, (booking.taxi_trips?.occupied_seats || 0) - booking.seats_booked) 
    })
    .eq('id', booking.trip_id);
  
  // Update the driver's message
  const rejectedMessage = `
❌ *Bron bekor qilindi*

👤 *Yo'lovchi:* ${booking.passenger_name}
💺 *Joylar:* ${booking.seats_booked} ta

📍 ${booking.taxi_trips?.from_district} → ${booking.taxi_trips?.to_district}
📅 ${booking.taxi_trips?.departure_date} | ${booking.taxi_trips?.departure_time}

Joylar qaytarildi.
  `.trim();
  
  await editMessage(chatId, messageId, rejectedMessage);
  
  // Notify passenger via Telegram
  if (booking.passenger_telegram_chat_id) {
    const passengerMessage = `
❌ *Afsuski, broningiz bekor qilindi*

Haydovchi sizning bron so'rovingizni qabul qila olmadi.

📍 *Yo'nalish:* ${booking.taxi_trips?.from_district} → ${booking.taxi_trips?.to_district}
📅 *Sana:* ${booking.taxi_trips?.departure_date}
🕐 *Vaqt:* ${booking.taxi_trips?.departure_time}

Boshqa sayohat qidiring:
    `.trim();
    
    const passengerKeyboard = {
      inline_keyboard: [
        [{ text: '🔍 Boshqa sayohat qidirish', callback_data: 'search_start' }]
      ]
    };
    
    await sendMessage(parseInt(booking.passenger_telegram_chat_id), passengerMessage, passengerKeyboard);
  }
}

async function sendMessage(
  chatId: number, 
  text: string, 
  replyMarkup?: { inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> }
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return response.json();
}

async function sendMessageWithReplyKeyboard(
  chatId: number, 
  text: string, 
  replyMarkup: { keyboard: Array<Array<{ text: string; request_contact?: boolean }>>; resize_keyboard?: boolean; one_time_keyboard?: boolean }
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: replyMarkup,
  };
  
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return response.json();
}

async function sendMessageRemoveKeyboard(
  chatId: number, 
  text: string, 
  inlineKeyboard?: { inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> }
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      remove_keyboard: true,
      ...(inlineKeyboard || {})
    },
  };
  
  if (inlineKeyboard) {
    body.reply_markup = {
      ...inlineKeyboard,
      remove_keyboard: true,
    };
  }
  
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return response.json();
}

async function editMessage(
  chatId: number,
  messageId: number,
  text: string, 
  replyMarkup?: { inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> }
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'Markdown',
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return response.json();
}
