
// This is a placeholder file. The contents will be filled in by the next step.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// This config is automatically provisioned by App Prototyper.
const firebaseConfig = {
  apiKey: "AIzaSyAaALewUmpRxUu4vQWuW_aFuJaNEjIhJ7g",
  authDomain: "studio-135307263-2de8f.firebaseapp.com",
  projectId: "studio-135307263-2de8f",
  storageBucket: "studio-135307263-2de8f.firebasestorage.app",
  messagingSenderId: "4408775762",
  appId: "1:4408775762:web:b49ecf5aca31f0e6847b8b"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
