import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface BookingNotification {
  tripId: string;
  passengerName: string;
  passengerPhone: string;
  seatsBooked: number;
  fromDistrict: string;
  toDistrict: string;
  departureDate: string;
  departureTime: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    console.log('Received action:', action, 'with params:', params);

    if (action === 'send_booking_notification') {
      return await sendBookingNotification(params as BookingNotification);
    } else if (action === 'verify_chat') {
      return await verifyChatId(params.chatId);
    } else if (action === 'send_proximity_notification') {
      return await sendProximityNotification(params);
    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in telegram notification function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendBookingNotification(booking: BookingNotification) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return new Response(
      JSON.stringify({ error: 'Telegram not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get the driver's telegram chat ID from the database
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: trip, error: tripError } = await supabase
    .from('taxi_trips')
    .select('user_id, driver_name')
    .eq('id', booking.tripId)
    .single();

  if (tripError || !trip) {
    console.error('Error fetching trip:', tripError);
    return new Response(
      JSON.stringify({ error: 'Trip not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: telegramData, error: telegramError } = await supabase
    .from('driver_telegram')
    .select('chat_id')
    .eq('user_id', trip.user_id)
    .single();

  if (telegramError || !telegramData) {
    console.log('Driver has no Telegram connected:', telegramError);
    return new Response(
      JSON.stringify({ success: true, message: 'No telegram configured for driver' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Format the notification message with location info
  let locationInfo = '';
  if (booking.pickupAddress) {
    locationInfo += `\n📌 *Olib ketish:* ${booking.pickupAddress}`;
    if (booking.pickupLat && booking.pickupLng) {
      locationInfo += `\n🗺 [Yandex Maps'da ko'rish](https://yandex.com/maps/?pt=${booking.pickupLng},${booking.pickupLat}&z=17&l=map)`;
    }
  }
  if (booking.dropoffAddress) {
    locationInfo += `\n🏁 *Tushirish:* ${booking.dropoffAddress}`;
    if (booking.dropoffLat && booking.dropoffLng) {
      locationInfo += `\n🗺 [Yandex Maps'da ko'rish](https://yandex.com/maps/?pt=${booking.dropoffLng},${booking.dropoffLat}&z=17&l=map)`;
    }
  }

  const message = `
🚖 *Yangi band qilish!*

📍 *Yo'nalish:* ${booking.fromDistrict} → ${booking.toDistrict}
📅 *Sana:* ${booking.departureDate}
⏰ *Vaqt:* ${booking.departureTime}

👤 *Yo'lovchi:* ${booking.passengerName}
📱 *Telefon:* ${booking.passengerPhone}
💺 *O'rinlar:* ${booking.seatsBooked}${locationInfo}
  `.trim();

  // Send the telegram message
  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const telegramResponse = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramData.chat_id,
      text: message,
      parse_mode: 'Markdown',
    }),
  });

  const telegramResult = await telegramResponse.json();
  console.log('Telegram API response:', telegramResult);

  if (!telegramResult.ok) {
    console.error('Telegram API error:', telegramResult);
    return new Response(
      JSON.stringify({ error: 'Failed to send telegram notification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Notification sent' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function verifyChatId(chatId: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Telegram not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Try to send a test message to verify the chat ID
  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const testMessage = "✅ Telegram muvaffaqiyatli ulandi!\n\nEndi yo'lovchilar band qilganda sizga xabar keladi.";
  
  const response = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: testMessage,
    }),
  });

  const result = await response.json();
  console.log('Telegram verification response:', result);

  if (!result.ok) {
    return new Response(
      JSON.stringify({ success: false, error: result.description }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

interface ProximityNotificationParams {
  passengerTelegramChatId?: string | null;
  passengerPhone?: string;
  passengerName: string;
  message: string;
  distanceKey: string;
}

async function sendProximityNotification(params: ProximityNotificationParams) {
  const { passengerTelegramChatId, passengerName, message, distanceKey } = params;

  console.log('Sending proximity notification:', params);

  // Only send via Telegram if chat ID is available
  if (!passengerTelegramChatId) {
    console.log('No Telegram chat ID for passenger, skipping notification');
    return new Response(
      JSON.stringify({ success: true, message: 'No telegram configured for passenger' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return new Response(
      JSON.stringify({ error: 'Telegram not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const fullMessage = `${message}\n\n👤 Hurmatli ${passengerName}, tayyorlaning!`;

  const telegramResponse = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: passengerTelegramChatId,
      text: fullMessage,
      parse_mode: 'Markdown',
    }),
  });

  const telegramResult = await telegramResponse.json();
  console.log('Proximity notification Telegram response:', telegramResult);

  if (!telegramResult.ok) {
    console.error('Telegram API error:', telegramResult);
    return new Response(
      JSON.stringify({ error: 'Failed to send telegram notification', details: telegramResult }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: `Proximity notification sent for ${distanceKey}` }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}