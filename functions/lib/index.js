"use strict";
/**
 * Firebase Cloud Functions for TaxiGo Telegram Notifications
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramWebhook = exports.verifyTelegramLogin = exports.verifyTelegramConnection = exports.sendProximityNotification = exports.sendBookingNotification = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
// Initialize Firebase Admin
admin.initializeApp();
// Define secret for Telegram Bot Token
const telegramBotToken = (0, params_1.defineSecret)("TELEGRAM_BOT_TOKEN");
// Telegram API helper - inline to access secret at runtime
async function sendTelegramMessage(chatId, text, token, parseMode = "HTML") {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: parseMode,
            }),
        });
        const data = (await response.json());
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
 * Send booking notification to driver via Telegram
 */
exports.sendBookingNotification = (0, https_1.onCall)({ cors: true, secrets: [telegramBotToken], region: "europe-west1" }, async (request) => {
    const data = request.data;
    if (!data.driverChatId) {
        throw new https_1.HttpsError("invalid-argument", "Driver chat ID is required");
    }
    if (!data.passengerName || !data.passengerPhone) {
        throw new https_1.HttpsError("invalid-argument", "Passenger info is required");
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
        throw new https_1.HttpsError("internal", `Failed: ${result.description}`);
    }
    return { success: true, message: "Notification sent" };
});
/**
 * Send proximity notification to passenger via Telegram
 */
exports.sendProximityNotification = (0, https_1.onCall)({ cors: true, secrets: [telegramBotToken], region: "europe-west1" }, async (request) => {
    const data = request.data;
    if (!data.passengerChatId) {
        throw new https_1.HttpsError("invalid-argument", "Passenger chat ID is required");
    }
    const messages = {
        "2km": "🚗 Haydovchi 2 km masofada!",
        "1km": "🚗 Haydovchi 1 km masofada! Tayyorlaning.",
        "500m": "🚗 Haydovchi 500 m masofada!",
        "200m": "🚗 Haydovchi yetib keldi!",
    };
    const message = messages[data.distanceKey] || "🚗 Haydovchi yaqinlashmoqda!";
    const token = telegramBotToken.value();
    const result = await sendTelegramMessage(data.passengerChatId, message, token);
    if (!result.ok) {
        throw new https_1.HttpsError("internal", `Failed: ${result.description}`);
    }
    return { success: true, message: "Notification sent" };
});
/**
 * Verify Telegram connection (test function)
 */
exports.verifyTelegramConnection = (0, https_1.onCall)({ cors: true, secrets: [telegramBotToken], region: "europe-west1" }, async (request) => {
    const data = request.data;
    if (!data.chatId) {
        throw new https_1.HttpsError("invalid-argument", "Chat ID is required");
    }
    const message = "✅ TaxiGo bilan bog'lanish muvaffaqiyatli!\n\nSiz endi buyurtmalar haqida xabar olasiz.";
    const token = telegramBotToken.value();
    const result = await sendTelegramMessage(data.chatId, message, token);
    if (!result.ok) {
        throw new https_1.HttpsError("internal", `Failed: ${result.description}`);
    }
    return { success: true, verified: true };
});
/**
 * Verify Telegram Login and create Firebase Custom Token
 */
exports.verifyTelegramLogin = (0, https_1.onCall)({ cors: true, secrets: [telegramBotToken], region: "europe-west1" }, async (request) => {
    const data = request.data;
    // Validate required fields
    if (!data.id || !data.hash || !data.auth_date) {
        throw new https_1.HttpsError("invalid-argument", "Missing Telegram auth data");
    }
    const token = telegramBotToken.value();
    // Verify the hash
    const crypto = await Promise.resolve().then(() => __importStar(require("crypto")));
    const secretKey = crypto.createHash("sha256").update(token).digest();
    // Build data check string (sorted alphabetically)
    const checkArr = [];
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
        throw new https_1.HttpsError("unauthenticated", "Invalid Telegram auth hash");
    }
    // Check auth_date (not older than 24 hours)
    const authDate = parseInt(data.auth_date);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
        throw new https_1.HttpsError("unauthenticated", "Telegram auth expired");
    }
    // Create or get user in Firebase
    const telegramId = String(data.id);
    const uid = `telegram_${telegramId}`;
    try {
        await admin.auth().getUser(uid);
    }
    catch (_a) {
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
});
/**
 * Telegram Bot Webhook - handles incoming messages from Telegram
 */
exports.telegramWebhook = (0, https_1.onRequest)({ cors: true, secrets: [telegramBotToken], region: "europe-west1" }, async (req, res) => {
    var _a;
    try {
        const update = req.body;
        // Handle message
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text || "";
            const firstName = ((_a = update.message.from) === null || _a === void 0 ? void 0 : _a.first_name) || "Foydalanuvchi";
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
    }
    catch (error) {
        console.error("Webhook error:", error);
        res.status(500).send("ERROR");
    }
});
//# sourceMappingURL=index.js.map