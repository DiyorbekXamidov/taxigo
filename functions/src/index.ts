/**
 * Firebase Cloud Functions for TaxiGo Telegram Notifications
 */

import * as admin from "firebase-admin";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// Initialize Firebase Admin
admin.initializeApp();

// Define secret for Telegram Bot Token
const telegramBotToken = defineSecret("TELEGRAM_BOT_TOKEN");

// Telegram API helper - inline to access secret at runtime
async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  token: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ ok: boolean; description?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: parseMode,
        }),
      }
    );

    const data = (await response.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.error("Telegram API error:", data.description);
    }
    return data;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return { ok: false, description: String(error) };
  }
}

/**
 * Send booking notification to driver via Telegram
 */
export const sendBookingNotification = onCall(
  { cors: true, secrets: [telegramBotToken], region: "europe-west1" },
  async (request) => {
    const data = request.data;

    if (!data.driverChatId) {
      throw new HttpsError("invalid-argument", "Driver chat ID is required");
    }

    if (!data.passengerName || !data.passengerPhone) {
      throw new HttpsError("invalid-argument", "Passenger info is required");
    }

    // Build message
    let message = `🚖 <b>Yangi buyurtma!</b>\n\n`;
    message += `👤 <b>Yo'lovchi:</b> ${data.passengerName}\n`;
    message += `📞 <b>Telefon:</b> ${data.passengerPhone}\n`;
    message += `👥 <b>Kishilar soni:</b> ${data.passengerCount || 1}\n`;
    message += `📍 <b>Yo'nalish:</b> ${data.tripFrom || "?"} → ${data.tripTo || "?"}\n`;

    if (data.pickupAddress) {
      message += `📌 <b>Olib ketish:</b> ${data.pickupAddress}\n`;
    }

    message += `\n⏰ <i>Iltimos, tez orada bog'laning!</i>`;

    const token = telegramBotToken.value();
    const result = await sendTelegramMessage(data.driverChatId, message, token);

    if (!result.ok) {
      throw new HttpsError("internal", `Failed: ${result.description}`);
    }

    return { success: true, message: "Notification sent" };
  }
);

/**
 * Send proximity notification to passenger via Telegram
 */
export const sendProximityNotification = onCall(
  { cors: true, secrets: [telegramBotToken], region: "europe-west1" },
  async (request) => {
    const data = request.data;

    if (!data.passengerChatId) {
      throw new HttpsError("invalid-argument", "Passenger chat ID is required");
    }

    const messages: Record<string, string> = {
      "2km": "🚗 Haydovchi 2 km masofada!",
      "1km": "🚗 Haydovchi 1 km masofada! Tayyorlaning.",
      "500m": "🚗 Haydovchi 500 m masofada!",
      "200m": "🚗 Haydovchi yetib keldi!",
    };

    const message = messages[data.distanceKey] || "🚗 Haydovchi yaqinlashmoqda!";
    const token = telegramBotToken.value();
    const result = await sendTelegramMessage(data.passengerChatId, message, token);

    if (!result.ok) {
      throw new HttpsError("internal", `Failed: ${result.description}`);
    }

    return { success: true, message: "Notification sent" };
  }
);

/**
 * Verify Telegram connection (test function)
 */
export const verifyTelegramConnection = onCall(
  { cors: true, secrets: [telegramBotToken], region: "europe-west1" },
  async (request) => {
    const data = request.data;

    if (!data.chatId) {
      throw new HttpsError("invalid-argument", "Chat ID is required");
    }

    const message = "✅ TaxiGo bilan bog'lanish muvaffaqiyatli!\n\nSiz endi buyurtmalar haqida xabar olasiz.";
    const token = telegramBotToken.value();
    const result = await sendTelegramMessage(data.chatId, message, token);

    if (!result.ok) {
      throw new HttpsError("internal", `Failed: ${result.description}`);
    }

    return { success: true, verified: true };
  }
);

/**
 * Verify Telegram Login and create Firebase Custom Token
 */
export const verifyTelegramLogin = onCall(
  { cors: true, secrets: [telegramBotToken], region: "europe-west1" },
  async (request) => {
    const data = request.data;

    // Validate required fields
    if (!data.id || !data.hash || !data.auth_date) {
      throw new HttpsError("invalid-argument", "Missing Telegram auth data");
    }

    const token = telegramBotToken.value();

    // Verify the hash
    const crypto = await import("crypto");
    const secretKey = crypto.createHash("sha256").update(token).digest();

    // Build data check string (sorted alphabetically)
    const checkArr: string[] = [];
    for (const key of Object.keys(data).sort()) {
      if (key !== "hash") {
        checkArr.push(`${key}=${data[key]}`);
      }
    }
    const dataCheckString = checkArr.join("\n");

    const hmac = crypto.createHmac("sha256", secretKey);
    hmac.update(dataCheckString);
    const calculatedHash = hmac.digest("hex");

    if (calculatedHash !== data.hash) {
      throw new HttpsError("unauthenticated", "Invalid Telegram auth hash");
    }

    // Check auth_date (not older than 24 hours)
    const authDate = parseInt(data.auth_date);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      throw new HttpsError("unauthenticated", "Telegram auth expired");
    }

    // Create or get user in Firebase
    const telegramId = String(data.id);
    const uid = `telegram_${telegramId}`;

    try {
      await admin.auth().getUser(uid);
    } catch {
      // User doesn't exist, create new
      await admin.auth().createUser({
        uid: uid,
        displayName: data.first_name + (data.last_name ? ` ${data.last_name}` : ""),
        photoURL: data.photo_url || undefined,
      });
    }

    // Save/update user data in Firestore
    await admin.firestore().collection("users").doc(uid).set({
      telegram_id: telegramId,
      telegram_username: data.username || null,
      name: data.first_name + (data.last_name ? ` ${data.last_name}` : ""),
      photo_url: data.photo_url || null,
      telegram_chat_id: telegramId,
      role: "passenger",
      updated_at: new Date().toISOString(),
    }, { merge: true });

    // Create custom token
    const customToken = await admin.auth().createCustomToken(uid, {
      telegramId: telegramId,
    });

    return {
      success: true,
      customToken: customToken,
      uid: uid,
    };
  }
);

/**
 * Telegram Bot Webhook - handles incoming messages from Telegram
 */
export const telegramWebhook = onRequest(
  { cors: true, secrets: [telegramBotToken], region: "europe-west1" },
  async (req, res) => {
    try {
      const update = req.body;
      
      // Handle message
      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text || "";
        const firstName = update.message.from?.first_name || "Foydalanuvchi";
        
        const token = telegramBotToken.value();
        
        // Handle /start command
        if (text === "/start" || text.startsWith("/start ")) {
          const welcomeMessage = `👋 Assalomu alaykum, ${firstName}!

🚖 <b>TaxiGo Surxondaryo</b> botiga xush kelibsiz!

Bu bot orqali siz:
• Buyurtmalar haqida xabar olasiz
• Haydovchi yaqinlashganda bildirishnoma olasiz
• Sayt orqali tez kirish imkoniyatiga ega bo'lasiz

🌐 Saytimiz: https://taxigouz-1b76d.web.app

✅ Sizning Chat ID: <code>${chatId}</code>
(Bu ID ni saytda Telegram ulanish uchun ishlating)`;

          await sendTelegramMessage(chatId, welcomeMessage, token);
        }
        // Handle /mychatid command
        else if (text === "/mychatid" || text === "/id") {
          const idMessage = `📱 Sizning Telegram Chat ID:

<code>${chatId}</code>

Bu ID ni TaxiGo saytida "Telegram bildirishnomalar" bo'limiga kiriting.`;

          await sendTelegramMessage(chatId, idMessage, token);
        }
        // Handle /help command
        else if (text === "/help") {
          const helpMessage = `🔹 <b>Mavjud buyruqlar:</b>

/start - Botni ishga tushirish
/mychatid - Chat ID ni ko'rish
/help - Yordam

🌐 Sayt: https://taxigouz-1b76d.web.app`;

          await sendTelegramMessage(chatId, helpMessage, token);
        }
      }
      
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("ERROR");
    }
  }
);
