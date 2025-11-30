
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from './use-toast';

const GUEST_USER = { uid: 'guest-user', email: 'guest@example.com', name: 'Guest' };

interface User {
  uid: string;
  email: string | null;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In a real app, this might come from a 'users' collection in Firestore.
const DEMO_USERS: { [email: string]: { name: string } } = {
  'basuki@example.com': { name: 'Basuki' },
  'chief@example.com': { name: 'Chief Engineer' },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(GUEST_USER);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      // Firebase is disabled, stay in guest mode and finish loading.
      setUser(GUEST_USER);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userEmail = firebaseUser.email || 'unknown@example.com';
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: DEMO_USERS[userEmail]?.name || 'Logged In User',
        });
      } else {
        // No user is logged in, default to guest user.
        setUser(GUEST_USER);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase is not enabled. Cannot log in.");
    }
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle setting the user state
  };

  const logout = async () => {
    if (!auth) {
      console.warn("Firebase is not enabled. Cannot log out.");
      return;
    }
    await signOut(auth);
    // onAuthStateChanged will handle setting the user back to guest
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
