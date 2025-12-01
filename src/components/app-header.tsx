
"use client";

import React from 'react';
import { SyncStatus } from "@/components/sync-status";
import { usePathname } from "next/navigation";
import { Icons } from './icons';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';
import { useData } from '@/hooks/use-data';


export function AppHeader() {
  const pathname = usePathname();
  const { settings, syncWithFirebase, isSyncing } = useData();
  const { user } = useAuth();


  const getBreadcrumb = () => {
    const parts = pathname.split('/').filter(p => p);
    if (parts.length === 0) {
      return (
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Dashboard</h1>
            <p className="hidden text-sm text-muted-foreground md:block">
              {settings?.shipName ? `Welcome to ${settings.shipName}.` : 'Loading ship data...'}
            </p>
          </div>
      )
    }
    
    const part = parts[parts.length - 1];
    let name = part.charAt(0).toUpperCase() + part.slice(1).replace('-', ' ');
    if (name === 'Logbook') {
        name = 'Input Data';
    }

    const description: { [key: string]: string } = {
        'logbook': "Record all engine activities.", // Tetap 'logbook' sebagai key
        'inventory': "Manage all parts and supplies.",
        'settings': "Configure your application settings.",
        'log-activity': "View all recent activities."
    };

    return (
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">{name}</h1>
            <p className="hidden text-sm text-muted-foreground md:block">{description[part] || `Manage ${name}`}</p>
        </div>
    )
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:h-20 lg:px-6">
      <div className="flex items-center gap-4">
        <Icons.logo className="hidden h-12 w-16 md:block" />
        {getBreadcrumb()}
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <SyncStatus />
        {user && user.uid !== 'guest-user' && (
          <Button variant="ghost" size="icon" onClick={syncWithFirebase} disabled={isSyncing}>
            <Icons.reset className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    </header>
  );
}
