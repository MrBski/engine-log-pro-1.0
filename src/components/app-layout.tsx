
'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import LoginPage from '@/app/login/page';
import { useEffect, useState } from 'react';

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
    // You can return a loading spinner here
    return (
      <div className="flex h-screen w-full items-center justify-center">
        {/* Or a more sophisticated skeleton loader */}
        <p>Loading application...</p>
      </div>
    );
  }

  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const requiresAuth = !isPublicPage;

  if (requiresAuth && !user) {
    return <LoginPage />;
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
