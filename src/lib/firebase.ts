
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

// Initialize Firebase only if all config values are present
const isConfigValid = Object.values(firebaseConfig).every(Boolean);

const app = isConfigValid && getApps().length === 0 ? initializeApp(firebaseConfig) : (isConfigValid ? getApp() : null);

// Conditionally export auth and db
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

if (!isConfigValid) {
    console.error("Firebase configuration is missing or incomplete. Please check your .env.local file.");
}

export { auth, db };
