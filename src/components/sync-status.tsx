
"use client";

import { useState, useEffect } from 'react';
import { Icons } from './icons';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useData } from '@/hooks/use-data';

export function SyncStatus() {
  const { user } = useAuth();
  const { isSyncing: dataIsSyncing } = useData();
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // This effect should only run on the client
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
        setIsOnline(window.navigator.onLine);
    }
    
    const handleOnline = () => {
      setIsOnline(true);
      toast({
          title: "Connection Restored",
          description: "You are back online. Data will sync automatically.",
        });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
          variant: "destructive",
          title: "Connection Lost",
          description: "You are now in offline mode. Your data is saved locally.",
        });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline',handleOffline);
    };
  }, [toast]);

  // Hide the indicator if user is not logged in (is a guest)
  if (user?.uid === 'guest-user') {
    return null;
  }

  let statusText = "Offline";
  let StatusIcon = Icons.wifiOff;
  let badgeVariant: "destructive" | "default" | "secondary" | "outline" | null | undefined = "destructive";

  if (isOnline) {
    statusText = dataIsSyncing ? "Syncing..." : "Online";
    StatusIcon = Icons.wifi;
    badgeVariant = dataIsSyncing ? "secondary" : "default"; // 'default' will be green-ish
  }

  return (
    <Badge variant={badgeVariant} className="flex items-center gap-2 transition-all">
      <StatusIcon className={cn("size-3.5", dataIsSyncing && "animate-pulse")} />
      <span className="text-xs font-medium">{statusText}</span>
    </Badge>
  );
}
