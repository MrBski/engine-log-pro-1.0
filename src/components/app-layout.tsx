
'use client';

import BottomNav from '@/components/bottom-nav';
import { useEffect, useState } from 'react';
import { Icons } from './icons';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This hook ensures that we only render the full app on the client side.
    // This is crucial for a PWA that relies on browser storage.
    setIsClient(true);
  }, []);

  // While waiting for the client to hydrate, show a static loading screen.
  // This prevents hydration mismatches and is only seen on the very first load.
  if (!isClient) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
        <Icons.logo className="h-20 w-24" />
        <p className="text-lg font-semibold">Engine Log Pro</p>
      </div>
    );
  }
  
  // Once the client is ready, render the full app layout immediately.
  // The DataProvider within the children will handle its own loading states
  // by showing skeletons, but the app frame itself is instantly available.
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mb-16 flex-1 p-4 lg:p-6">{children}</main>
      <BottomNav />
    </div>
  );
}
