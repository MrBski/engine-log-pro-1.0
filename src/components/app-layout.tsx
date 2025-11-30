
'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import LoginPage from '@/app/login/page';
import { useEffect, useState } from 'react';
import { Icons } from './icons';

// Halaman login tidak akan digunakan dalam alur utama lagi, tapi kita simpan filenya
const PUBLIC_PATHS = ['/login']; 

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isLoading || !isClient) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
        <Icons.logo className="h-20 w-24 animate-pulse" />
        <p className="text-lg font-semibold">Loading Application...</p>
      </div>
    );
  }

  // Jika halaman login diakses secara langsung, tampilkan saja.
  if (pathname === '/login') {
    return <LoginPage />;
  }

  // Untuk semua halaman lain, tampilkan layout utama aplikasi
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mb-16 flex-1 p-4 lg:p-6">{children}</main>
      <BottomNav />
    </div>
  );
}
