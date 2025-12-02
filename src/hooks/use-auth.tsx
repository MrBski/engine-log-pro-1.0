'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// --- KONSTANTA GLOBAL ---
const GUEST_SHIP_ID = "SMS16011";
const GUEST_USER = { uid: 'guest-user', email: 'guest@example.com', name: 'Guest', shipId: GUEST_SHIP_ID };

/**
 * @description Interface untuk representasi user di aplikasi (termasuk shipId untuk data partitioning).
 */
interface User {
  uid: string;
  email: string | null;
  name: string;
  shipId: string; // ID Kapal, digunakan sebagai kunci koleksi data di Firestore
}

/**
 * @description Definisi interface Context yang diekspos oleh useAuth.
 */
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * @description Mengambil nama user yang ramah dari objek Firebase User.
 * Prioritas: displayName > nama dari email > 'User'.
 */
const getUserName = (firebaseUser: FirebaseUser | null): string => {
    if (!firebaseUser) return 'Guest';
    if (firebaseUser.displayName) return firebaseUser.displayName;
    if (firebaseUser.email) {
        const emailName = firebaseUser.email.split('@')[0];
        // Memformat nama (contoh: "basuki_rahmat" menjadi "Basuki Rahmat")
        return emailName.replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'User';
}

/**
 * @description Menentukan ID Kapal (shipId) dari email user yang login.
 * Menggunakan domain tingkat pertama (contoh: user@kapal123.com -> KAPAL123).
 */
const getShipId = (firebaseUser: FirebaseUser | null): string => {
    if (firebaseUser && firebaseUser.email) {
        const domain = firebaseUser.email.split('@')[1];
        if (domain) {
            return domain.split('.')[0].toUpperCase();
        }
    }
    // Fallback untuk user Guest atau jika format email tidak standar
    return GUEST_SHIP_ID;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * @description Effect utama untuk otentikasi.
   * Melakukan: 1. Memuat state user dari Local Storage (untuk fast startup). 
   * 2. Menghubungkan ke onAuthStateChanged Firebase untuk sync status.
   */
  useEffect(() => {
    // 1. Coba muat user dari Local Storage (Fast Startup / Offline fallback)
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
        try {
            setUser(JSON.parse(storedUser));
        } catch (e) {
            console.error("Failed to parse stored user", e);
            localStorage.removeItem('authUser');
        }
    }

    // Safety check jika Firebase/Auth tidak terinisialisasi
    if (!auth) {
      setUser(GUEST_USER);
      setIsLoading(false);
      return;
    }

    // 2. Hubungkan ke listener Firebase
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User terotentikasi dari Firebase
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: getUserName(firebaseUser),
          shipId: getShipId(firebaseUser), 
        };
        setUser(userData);
        localStorage.setItem('authUser', JSON.stringify(userData)); // Simpan state terbaru
      } else {
        // User logout atau sesi berakhir
        setUser(GUEST_USER);
        localStorage.removeItem('authUser');
      }
      setIsLoading(false);
    });

    // Clean-up: Lepaskan listener saat komponen di-unmount
    return () => unsubscribe();
  }, []);

  /**
   * @description Melakukan proses login menggunakan Firebase Email/Password.
   */
  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase is not enabled. Cannot log in.");
    }
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged listener akan menangkap perubahan status ini.
  };

  /**
   * @description Melakukan proses logout dari Firebase.
   */
  const logout = async () => {
    if (!auth) {
      console.warn("Firebase is not enabled. Cannot log out. Forcing Guest mode.");
      setUser(GUEST_USER);
      localStorage.removeItem('authUser');
      return;
    }
    await signOut(auth);
    // onAuthStateChanged listener akan menangkap perubahan status ini.
  };

  /**
   * @description Memperbarui display name user di Firebase dan state lokal.
   * Penting untuk segera memperbarui state lokal agar user tidak melihat flicker.
   */
  const updateUserName = async (name: string) => {
    if (!auth || !auth.currentUser) {
        throw new Error("User must be logged in to update their name.");
    }
    
    // Update di Firebase
    await updateProfile(auth.currentUser, { displayName: name });
    
    // Update state lokal secara manual untuk respons UI instan
    setUser(prevUser => {
        if (!prevUser || prevUser.uid === 'guest-user') return prevUser;
        const updatedUser = { ...prevUser, name: name };
        localStorage.setItem('authUser', JSON.stringify(updatedUser));
        return updatedUser;
    });
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUserName }}>
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
