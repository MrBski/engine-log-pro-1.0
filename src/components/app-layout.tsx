
'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import LoginPage from '@/app/login/page';
import { useEffect, useState } from 'react';
import { Icons } from './icons';

// Pages that don't require authentication
const PUBLIC_PATHS = ['/login'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isLoading || !isClient) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
        <Icons.logo className="h-16 w-16 animate-pulse text-primary" />
        <p className="text-lg font-semibold">Loading Application...</p>
      </div>
    );
  }

  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const requiresAuth = !isPublicPage;

  if (requiresAuth && !user) {
    return <LoginPage />;
  }
  
  if (isPublicPage && user) {
     // Don't show login page if user is already logged in
     return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
            <Icons.logo className="h-16 w-16 animate-pulse text-primary" />
            <p className="text-lg font-semibold">Redirecting...</p>
      </div>
     )
  }


  if (isPublicPage) {
    return <>{children}</>;
  }

  // Render the main app layout for authenticated users
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mb-16 flex-1 p-4 lg:p-6">{children}</main>
      <BottomNav />
    </div>
  );
}
