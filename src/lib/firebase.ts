import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// PLACEHOLDER CONFIGURATION
// Replace these values with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-app-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-app.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "00000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:00000000000:web:0000000000000000",
};

// Initialize Firebase only if config seems real to avoid crashes when placeholder is used
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY" && !!firebaseConfig.apiKey;

const app = !getApps().length && isConfigured ? initializeApp(firebaseConfig) : (isConfigured ? getApp() : null);

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();
