
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const GUEST_SHIP_ID = "guest-ship";
const GUEST_USER = { uid: 'guest-user', email: 'guest@example.com', name: 'Guest', shipId: GUEST_SHIP_ID };

interface User {
  uid: string;
  email: string | null;
  name: string;
  shipId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get a user-friendly name from a Firebase user object
const getUserName = (firebaseUser: FirebaseUser | null): string => {
    if (!firebaseUser) return 'Guest';
    if (firebaseUser.displayName) return firebaseUser.displayName;
    if (firebaseUser.email) {
        const emailName = firebaseUser.email.split('@')[0];
        return emailName.replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'User';
}

// Helper to get a ship ID from an email address
const getShipIdFromEmail = (email: string | null): string => {
    if (!email) return GUEST_SHIP_ID;
    const match = email.match(/@([^.]+)\.?/);
    return match ? match[1] : GUEST_SHIP_ID;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(GUEST_USER);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setUser(GUEST_USER);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: getUserName(firebaseUser),
          shipId: getShipIdFromEmail(firebaseUser.email),
        });
      } else {
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
  };

  const logout = async () => {
    if (!auth) {
      console.warn("Firebase is not enabled. Cannot log out.");
      return;
    }
    await signOut(auth);
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
