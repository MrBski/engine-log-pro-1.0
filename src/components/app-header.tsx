
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
  const { settings } = useData();
  const { user, logout } = useAuth();


  const getBreadcrumb = () => {
    const parts = pathname.split('/').filter(p => p);
    if (parts.length === 0) {
      return (
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Dashboard</h1>
            <p className="hidden text-sm text-muted-foreground md:block">
              Welcome to {settings.shipName}.
            </p>
          </div>
      )
    }
    
    const part = parts[parts.length - 1];
    const name = part.charAt(0).toUpperCase() + part.slice(1).replace('-', ' ');
    const description = {
        'logbook': "Record and view all engine activities.",
        'inventory': "Manage all parts and supplies.",
        'settings': "Configure your application settings.",
        'log-activity': "View all recent activities."
    }[part] || `Manage ${name}`;

    return (
        <div>
            <h1 className="text-xl font-semibold md:text-2xl">{name}</h1>
            <p className="hidden text-sm text-muted-foreground md:block">{description}</p>
        </div>
    )
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:h-20 lg:px-6">
      <div className="flex items-center gap-4">
        <Icons.logo className="hidden size-8 text-primary md:block" />
        {getBreadcrumb()}
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <SyncStatus />
        <Avatar className="size-8 md:size-10">
            <AvatarImage src={`https://picsum.photos/seed/${user?.name}/40/40`} data-ai-hint="profile picture" alt={user?.name} />
            <AvatarFallback>{user?.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Button variant="ghost" size="icon" onClick={logout}>
          <Icons.logout className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
