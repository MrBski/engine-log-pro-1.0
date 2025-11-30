
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
// import { auth } from '@/lib/firebase'; // Kita nonaktifkan firebase auth untuk sementara
import { useToast } from './use-toast';

// Definisikan 'auth' sebagai null untuk mode offline/publik
const auth = null;

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
  // Secara default, kita sediakan pengguna "Tamu" agar aplikasi bisa langsung jalan
  const [user, setUser] = useState<User | null>({ uid: 'guest-user', email: 'guest@example.com', name: 'Guest' });
  const [isLoading, setIsLoading] = useState(false); // Tidak ada lagi loading auth state
  const router = useRouter();
  const { toast } = useToast();

  // Logika onAuthStateChanged tidak lagi diperlukan untuk alur ini
  // useEffect(() => { ... });

  const login = async (email: string, password: string) => {
    toast({ variant: 'destructive', title: 'Not Implemented', description: 'Login is currently disabled.' });
    // Logika login Firebase bisa ditambahkan di sini nanti saat sinkronisasi diaktifkan
    // Contoh:
    // try {
    //   if (!auth) throw new Error("Firebase is not configured.");
    //   await signInWithEmailAndPassword(auth, email, password);
    //   router.push('/');
    // } catch (error: any) { ... }
  };

  const logout = async () => {
    toast({ title: 'Logged Out', description: 'You have been logged out.' });
    // Logika logout Firebase bisa ditambahkan di sini nanti
    // setUser(null) // kembali ke guest
    // router.push('/')
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
