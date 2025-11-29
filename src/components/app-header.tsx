"use client";

import React from 'react';
import { SyncStatus } from "@/components/sync-status";
import { usePathname } from "next/navigation";
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { getInitialData, type AppSettings } from '@/lib/data';
import { Anchor } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


export function AppHeader() {
  const pathname = usePathname();
  const [settings] = useLocalStorage<AppSettings>('settings', getInitialData().settings);

  const getBreadcrumb = () => {
    const parts = pathname.split('/').filter(p => p);
    if (parts.length === 0) {
      return (
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome to {settings.shipName}.
            </p>
          </div>
      )
    }
    
    const part = parts[parts.length - 1];
    const name = part.charAt(0).toUpperCase() + part.slice(1);
    const description = {
        logbook: "Record and view all engine activities.",
        inventory: "Manage all parts and supplies.",
        settings: "Configure your application settings."
    }[part] || `Manage ${name}`;

    return (
        <div>
            <h1 className="text-2xl font-semibold">{name}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    )
  }

  return (
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-4">
        <Anchor className="size-8 text-primary" />
        {getBreadcrumb()}
      </div>
      <div className="flex items-center gap-4">
        <SyncStatus />
        <Avatar className="size-10">
            <AvatarImage src="https://picsum.photos/seed/user/40/40" data-ai-hint="profile picture" alt="User" />
            <AvatarFallback>CE</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
