
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from './use-toast';

interface User {
  uid: string;
  email: string | null;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded user profiles. In a real app, this might come from a 'users' collection in Firestore.
const DEMO_USERS: { [email: string]: { name: string } } = {
  'basuki@example.com': { name: 'Basuki' },
  'chief@example.com': { name: 'Chief Engineer' },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
        setIsLoading(false);
        // Don't subscribe to auth state if firebase isn't configured
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in.
        const profileName = firebaseUser.email ? (DEMO_USERS[firebaseUser.email]?.name || firebaseUser.email.split('@')[0]) : 'User';
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: profileName,
        });
      } else {
        // User is signed out.
        setUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase configuration is missing. Cannot log in.");
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (error: any) {
      console.error("Firebase login error:", error);
      // Provide a more specific error message if possible
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-api-key') {
          throw new Error('Invalid email, password, or Firebase configuration.');
      }
      throw new Error('An unexpected error occurred during login.');
    }
  };

  const logout = async () => {
    if (!auth) {
       toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'Firebase is not configured.',
      });
      return;
    }
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'Could not log you out. Please try again.',
      });
    }
  };

  if (!auth && !isLoading) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md rounded-lg border border-destructive bg-card p-6 text-center text-card-foreground">
                <h1 className="text-xl font-bold text-destructive">Firebase Configuration Error</h1>
                <p className="mt-2 text-muted-foreground">The application could not connect to Firebase. Please ensure you have created a <code>.env.local</code> file with the correct Firebase project credentials.</p>
            </div>
        </div>
    )
  }

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
