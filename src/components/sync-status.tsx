"use client";

import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // This effect should only run on the client
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
        setIsOnline(window.navigator.onLine);
    }
    
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      toast({
        title: "Connection Restored",
        description: "Attempting to sync local data...",
      });

      // Simulate sync process
      setTimeout(() => {
        setIsSyncing(false);
        toast({
          title: "Sync Complete",
          description: "Your data is now up-to-date.",
        });
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
      toast({
        variant: "destructive",
        title: "Connection Lost",
        description: "You are now in offline mode. Changes will be saved locally.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline',handleOffline);
    };
  }, [toast]);

  let statusText = "Offline";
  let StatusIcon = WifiOff;
  let badgeVariant: "destructive" | "default" | "secondary" | "outline" | null | undefined = "destructive";

  if (isOnline) {
    statusText = isSyncing ? "Syncing..." : "Online";
    StatusIcon = Wifi;
    badgeVariant = isSyncing ? "secondary" : "default";
  }

  return (
    <Badge variant={badgeVariant} className="flex items-center gap-2 transition-all">
      <StatusIcon className={cn("size-3.5", isSyncing && "animate-pulse")} />
      <span className="text-xs font-medium">{statusText}</span>
    </Badge>
  );
}
