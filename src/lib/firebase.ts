
// This is a placeholder file. The contents will be filled in by the next step.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// This config is automatically provisioned by App Prototyper.
const firebaseConfig = {
  "apiKey": "your-api-key",
  "authDomain": "your-auth-domain",
  "projectId": "studio-135307263-2de8f",
  "storageBucket": "your-storage-bucket",
  "messagingSenderId": "your-messaging-sender-id",
  "appId": "your-app-id"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
