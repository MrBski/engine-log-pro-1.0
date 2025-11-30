// This is a placeholder file. The contents will be filled in by the next step.
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// This config now reads from environment variables for better security.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Re-enable Firebase
const USE_FIREBASE = true;

// Initialize Firebase only if all config values are present AND Firebase is enabled
const isConfigValid = Object.values(firebaseConfig).every(Boolean);

const app = USE_FIREBASE && isConfigValid && getApps().length === 0 ? initializeApp(firebaseConfig) : (USE_FIREBASE && isConfigValid ? getApp() : null);

// Conditionally export auth and db
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

export { auth, db };
