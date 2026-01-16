"use strict";
/**
 * Telegram API Helper for Firebase Cloud Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramMessage = sendTelegramMessage;
exports.formatBookingMessage = formatBookingMessage;
exports.formatProximityMessage = formatProximityMessage;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
/**
 * Send a message to a Telegram chat
 */
async function sendTelegramMessage(chatId, text, parseMode = "HTML") {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: parseMode,
            }),
        });
        const data = await response.json();
        if (!data.ok) {
            console.error("Telegram API error:", data.description);
        }
        return data;
    }
    catch (error) {
        console.error("Failed to send Telegram message:", error);
        return { ok: false, description: String(error) };
    }
}
/**
 * Format booking notification message for driver
 */
function formatBookingMessage(data) {
    let message = `🚖 <b>Yangi buyurtma!</b>\n\n`;
    message += `👤 <b>Yo'lovchi:</b> ${data.passengerName}\n`;
    message += `📞 <b>Telefon:</b> ${data.passengerPhone}\n`;
    message += `👥 <b>Kishilar soni:</b> ${data.passengerCount}\n`;
    message += `📍 <b>Yo'nalish:</b> ${data.tripFrom} → ${data.tripTo}\n`;
    if (data.pickupAddress) {
        message += `📌 <b>Olib ketish joyi:</b> ${data.pickupAddress}\n`;
    }
    if (data.note) {
        message += `💬 <b>Izoh:</b> ${data.note}\n`;
    }
    message += `\n⏰ <i>Iltimos, tez orada bog'laning!</i>`;
    return message;
}
/**
 * Format proximity notification message for passenger
 */
function formatProximityMessage(distanceKey) {
    const messages = {
        "2km": "🚗 Haydovchi 2 km masofada!",
        "1km": "🚗 Haydovchi 1 km masofada! Tayyorlaning.",
        "500m": "🚗 Haydovchi 500 m masofada! Tez orada yetib keladi.",
        "200m": "🚗 Haydovchi yetib keldi! Chiqishga tayyorlaning.",
    };
    return messages[distanceKey] || "🚗 Haydovchi yaqinlashmoqda!";
}
//# sourceMappingURL=telegram.js.map