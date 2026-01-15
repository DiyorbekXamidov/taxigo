import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8493109056:AAG6PkzIneCyo3O6Gwt58T8kkZycoAo-pJk';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, trip, passengers, changes } = await req.json();

    if (action === 'trip_updated') {
      // Notify all passengers about trip update
      let successCount = 0;
      
      for (const passenger of passengers || []) {
        if (passenger.telegram_chat_id) {
          const message = formatTripUpdateMessage(trip, changes, passenger.name);
          await sendTelegramMessage(passenger.telegram_chat_id, message);
          successCount++;
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        notified: successCount 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'booking_confirmed') {
      // Notify passenger about booking confirmation
      const { passenger_chat_id, booking } = await req.json();
      
      if (passenger_chat_id) {
        const message = `
✅ *BRON TASDIQLANDI!*

📍 ${booking.from_district} → ${booking.to_district}
📅 ${booking.departure_date}
🕐 ${booking.departure_time}
👤 Haydovchi: ${booking.driver_name}
📞 Tel: ${booking.driver_phone}

O'rinlar: ${booking.seats}
💰 Narx: ${booking.total_price} so'm

Yaxshi safar!
        `.trim();
        
        await sendTelegramMessage(passenger_chat_id, message);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Notify error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function formatTripUpdateMessage(
  trip: { from_district: string; to_district: string; departure_date: string; departure_time: string; driver_name: string },
  changes: { field: string; old_value: string; new_value: string }[],
  passengerName: string
): string {
  const changesText = changes.map(c => {
    const fieldNames: Record<string, string> = {
      departure_time: '🕐 Ketish vaqti',
      departure_date: '📅 Sana',
      from_district: '📍 Qayerdan',
      to_district: '📍 Qayerga',
      price_per_seat: '💰 Narx',
    };
    const fieldName = fieldNames[c.field] || c.field;
    return `${fieldName}: ${c.old_value} → ${c.new_value}`;
  }).join('\n');

  return `
⚠️ *SAYOHAT O'ZGARTIRILDI*

Hurmatli ${passengerName}!

Siz band qilgan sayohat ma'lumotlari o'zgartirildi:

📍 ${trip.from_district} → ${trip.to_district}
📅 ${trip.departure_date}
🕐 ${trip.departure_time}
👤 Haydovchi: ${trip.driver_name}

*O'zgarishlar:*
${changesText}

Agar bu sizga mos kelmasa, iltimos haydovchi bilan bog'laning.
  `.trim();
}

async function sendTelegramMessage(chatId: string | number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });
}
