// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDl6azrQvk_E4rC40JbPCLlTjUoc3oEWYU",
  authDomain: "taxigouz-1b76d.firebaseapp.com",
  databaseURL: "https://taxigouz-1b76d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "taxigouz-1b76d",
  storageBucket: "taxigouz-1b76d.firebasestorage.app",
  messagingSenderId: "1017942928286",
  appId: "1:1017942928286:web:8d5a439348defa8a0ac48f",
  measurementId: "G-8RRBS4S6YY"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app, "europe-west1");

// Initialize Analytics only if supported (not in SSR or localhost without HTTPS)
export const initializeAnalytics = async () => {
  const supported = await isSupported();
  if (supported) {
    return getAnalytics(app);
  }
  return null;
};

// Auth state observer helper
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Cloud Functions helpers
export const sendBookingNotification = httpsCallable(functions, 'sendBookingNotification');
export const sendProximityNotification = httpsCallable(functions, 'sendProximityNotification');
export const verifyTelegramConnection = httpsCallable(functions, 'verifyTelegramConnection');
export const verifyTelegramLogin = httpsCallable(functions, 'verifyTelegramLogin');

// Export types
export type { User };

export default app;
