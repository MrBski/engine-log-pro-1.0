
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// A temporary, hardcoded user list for demonstration.
// In a real app, this would come from a database.
const DEMO_USERS = {
  'Chief': 'password123',
  '2nd Engineer': 'password123',
  'Oiler': 'password123',
};
type DemoUser = keyof typeof DEMO_USERS;

interface User {
  name: DemoUser;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for a logged-in user in local storage on initial load
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to parse user from local storage', error);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (username: string, password: string) => {
    const validUser = Object.keys(DEMO_USERS).find(u => u.toLowerCase() === username.toLowerCase()) as DemoUser | undefined;
    
    if (validUser && DEMO_USERS[validUser] === password) {
      const userData: User = { name: validUser };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      router.push('/');
    } else {
      throw new Error('Invalid username or password.');
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
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
