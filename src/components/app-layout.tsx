
'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import { useEffect, useState } from 'react';
import { Icons } from './icons';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading: authIsLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // While waiting for client-side hydration, show a minimal loader.
  // This flicker should be very brief on subsequent loads.
  if (!isClient || authIsLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
        <Icons.logo className="h-20 w-24" />
        <p className="text-lg font-semibold">Engine Log Pro</p>
      </div>
    );
  }

  // Render the main app layout immediately.
  // The DataProvider will handle showing skeleton loaders inside the children components.
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mb-16 flex-1 p-4 lg:p-6">{children}</main>
      <BottomNav />
    </div>
  );
}
