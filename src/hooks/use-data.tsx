
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    addDoc,
    deleteDoc,
    updateDoc,
    setDoc,
    getDoc,
    getDocs,
    Timestamp,
    query,
    orderBy,
    writeBatch,
} from 'firebase/firestore';
import {
    type AppSettings,
    type EngineLog,
    type InventoryItem,
    type ActivityLog,
    type LogSection,
    getInitialData,
} from '@/lib/data';
import { useToast } from './use-toast';

// Helper to convert Firestore Timestamps to JS Dates in any object
const convertDocTimestamps = (docData: any): any => {
    if (!docData) return docData;

    const convert = (data: any): any => {
        if (data instanceof Timestamp) {
            return data.toDate();
        }
        if (Array.isArray(data)) {
            return data.map(convert);
        }
        if (data !== null && typeof data === 'object' && !data.hasOwnProperty('nanoseconds')) { // Avoid converting non-timestamp objects
            const newObj: { [key: string]: any } = {};
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    newObj[key] = convert(data[key]);
                }
            }
            return newObj;
        }
        return data;
    };

    return convert(docData);
};


interface DataContextType {
  settings: AppSettings | undefined;
  updateSettings: (newSettings: Partial<Omit<AppSettings, 'id'>>) => Promise<void>;
  settingsLoading: boolean;
  
  logs: EngineLog[];
  addLog: (log: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<string | undefined>;
  deleteLog: (logId: string) => Promise<void>;
  logsLoading: boolean;

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  inventoryLoading: boolean;
  
  activityLog: ActivityLog[];
  addActivityLog: (activity: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<void>;
  activityLogLoading: boolean;

  logbookSections: LogSection[] | undefined;
  updateLogbookSections: (sections: LogSection[]) => Promise<void>;
  logbookLoading: boolean;

  isSyncing: boolean;
  syncWithFirebase: () => Promise<void>;
  loading: boolean; // General loading state
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const MAIN_COLLECTION_PREFIX = 'TB.';

// Functions to interact with localStorage
const getLocalData = (key: string, defaultValue: any) => {
    if (typeof window === 'undefined') return defaultValue;
    const saved = localStorage.getItem(key);
    try {
      const parsed = saved ? JSON.parse(saved) : defaultValue;
      return parsed; // Timestamps are stored as ISO strings
    } catch (e) {
        console.error("Failed to parse local data for key:", key, e);
        return defaultValue;
    }
};

const setLocalData = (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
};


export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    
    const [settings, setSettings] = useState<AppSettings | undefined>();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<EngineLog[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [logbookSections, setLogbookSections] = useState<LogSection[] | undefined>();
    
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(true);
    const [activityLogLoading, setActivityLogLoading] = useState(true);
    const [logbookLoading, setLogbookLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const shipId = user?.shipId;
    const mainCollectionId = shipId ? `${MAIN_COLLECTION_PREFIX}${shipId}` : undefined;
    
    const loadLocalData = useCallback(() => {
        const currentShipId = user?.shipId || 'guest-user';
        const initialData = getInitialData();
        setSettings(getLocalData(`settings_${currentShipId}`, initialData.settings));
        setInventory(getLocalData(`inventory_${currentShipId}`, initialData.inventory));
        setLogs(getLocalData(`logs_${currentShipId}`, initialData.logs));
        setActivityLog(getLocalData(`activityLog_${currentShipId}`, initialData.activityLog));
        setLogbookSections(getLocalData(`logbookSections_${currentShipId}`, initialData.logbookSections));
        
        setSettingsLoading(false);
        setInventoryLoading(false);
        setLogsLoading(false);
        setActivityLogLoading(false);
        setLogbookLoading(false);
    }, [user?.shipId]);

    const syncWithFirebase = useCallback(async (isSilent = false) => {
        if (!user || user.uid === 'guest-user' || !db || !navigator.onLine || !mainCollectionId) {
            if (!isSilent) toast({ title: "Sync Failed", description: "You are offline or not logged in.", variant: "destructive" });
            return;
        }
        setIsSyncing(true);
        if (!isSilent) toast({ title: "Syncing...", description: "Fetching latest data from server." });

        try {
            const shipDocRef = doc(db, mainCollectionId, shipId);
            
            let settingsSnap = await getDoc(shipDocRef);

            // If ship document doesn't exist, create it with initial data
            if (!settingsSnap.exists()) {
                if (!isSilent) toast({ title: "New Setup", description: `Initializing database for ${shipId}.` });
                const initialData = getInitialData();
                const batch = writeBatch(db);

                batch.set(shipDocRef, { ...initialData.settings, shipName: shipId }); // Use shipId as name by default
                batch.set(doc(shipDocRef, 'config', 'logbook'), { sections: initialData.logbookSections });
                
                await batch.commit();

                // Re-fetch the settings snapshot
                settingsSnap = await getDoc(shipDocRef);
            }
            
            const logbookSnap = await getDoc(doc(shipDocRef, 'config', 'logbook'));
            
            const [inventorySnap, logsSnap, activityLogSnap] = await Promise.all([
                getDocs(query(collection(shipDocRef, 'inventory'))),
                getDocs(query(collection(shipDocRef, 'logs'), orderBy('timestamp', 'desc'))),
                getDocs(query(collection(shipDocRef, 'activityLog'), orderBy('timestamp', 'desc'))),
            ]);

            const remoteSettings = settingsSnap.exists() ? convertDocTimestamps(settingsSnap.data()) : getInitialData().settings;
            setSettings(remoteSettings);
            setLocalData(`settings_${shipId}`, remoteSettings);
            
            const remoteLogbook = logbookSnap.exists() ? logbookSnap.data().sections : getInitialData().logbookSections;
            setLogbookSections(remoteLogbook);
            setLocalData(`logbookSections_${shipId}`, remoteLogbook);

            const remoteInventory = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryItem[];
            setInventory(remoteInventory);
            setLocalData(`inventory_${shipId}`, remoteInventory);

            const remoteLogs = logsSnap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as EngineLog[];
            setLogs(remoteLogs);
            setLocalData(`logs_${shipId}`, remoteLogs);
            
            const remoteActivityLog = activityLogSnap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as ActivityLog[];
            setActivityLog(remoteActivityLog);
            setLocalData(`activityLog_${shipId}`, remoteActivityLog);

            if (!isSilent) toast({ title: "Sync Complete", description: "Your data is up to date." });

        } catch (error: any) {
            console.error("Firebase sync failed:", error);
            if (!isSilent) toast({ title: "Sync Error", description: error.message || "Could not fetch data from Firebase.", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    }, [user, shipId, mainCollectionId, toast]);

    useEffect(() => {
        loadLocalData();
    }, [loadLocalData]);

    // This effect handles the initial load and scheduled sync
    useEffect(() => {
        if (user && user.uid !== 'guest-user') {
            // Perform an initial sync on login
            syncWithFirebase(true);

            // Set up an interval for periodic syncing
            const interval = setInterval(() => {
                syncWithFirebase(true); // isSilent = true
            }, 15 * 60 * 1000); // 15 minutes

            // Cleanup on unmount or user change
            return () => clearInterval(interval);
        }
    }, [user?.uid, syncWithFirebase]); // Depend on user.uid (primitive)


    const performWrite = async (
        updateLocalState: () => void,
        firebaseWriteFn?: () => Promise<any>
    ) => {
        updateLocalState(); // Always update UI and local storage immediately
        if (db && user && user.uid !== 'guest-user' && navigator.onLine && firebaseWriteFn) {
            try {
                await firebaseWriteFn();
            } catch (error: any) {
                console.error("Firebase write failed, but data is saved locally:", error);
                toast({ title: "Sync Failed", description: error.message || "Could not save to server. Data is saved locally.", variant: 'destructive'});
            }
        }
    };
    
    // --- Mutators ---

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        if (!shipId || !mainCollectionId) return;
        const updateFn = () => {
            setSettings(prev => {
                const updated = { ...(prev || getInitialData().settings), ...newSettings };
                setLocalData(`settings_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => setDoc(doc(db, mainCollectionId, shipId), newSettings, { merge: true });
        await performWrite(updateFn, firebaseFn);
    };

    const addLog = async (logData: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        if (!shipId || !mainCollectionId) return;
        const newLogId = `log_${Date.now()}`;
        const newLog = { ...logData, id: newLogId, timestamp: logData.timestamp.toISOString() };
        
        const updateFn = () => {
            setLogs(prev => {
                const updated = [newLog as any, ...prev].sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
                setLocalData(`logs_${shipId}`, updated);
                return updated;
            });
        };
        const shipDocRef = doc(db, mainCollectionId, shipId);
        const firebaseFn = () => setDoc(doc(shipDocRef, 'logs', newLogId), { ...logData, timestamp: Timestamp.fromDate(logData.timestamp) });
        
        await performWrite(updateFn, firebaseFn);
        return newLogId;
    };
    
    const deleteLog = async (logId: string) => {
        if (!shipId || !mainCollectionId) return;
        const updateFn = () => {
            setLogs(prev => {
                const updated = prev.filter(l => l.id !== logId);
                setLocalData(`logs_${shipId}`, updated);
                return updated;
            });
        };
        const shipDocRef = doc(db, mainCollectionId, shipId);
        const firebaseFn = () => deleteDoc(doc(shipDocRef, 'logs', logId));
        await performWrite(updateFn, firebaseFn);
    };

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        if (!shipId || !mainCollectionId) return;
        const newItemId = `inv_${Date.now()}`;
        const newItem = { ...itemData, id: newItemId };
        
        const updateFn = () => {
            setInventory(prev => {
                const updated = [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name));
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const shipDocRef = doc(db, mainCollectionId, shipId);
        const firebaseFn = () => setDoc(doc(shipDocRef, 'inventory', newItemId), itemData);
        await performWrite(updateFn, firebaseFn);
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        if (!shipId || !mainCollectionId) return;
        const updateFn = () => {
            setInventory(prev => {
                const updated = prev.map(item => item.id === itemId ? { ...item, ...updates } : item);
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const shipDocRef = doc(db, mainCollectionId, shipId);
        const firebaseFn = () => updateDoc(doc(shipDocRef, 'inventory', itemId), updates);
        await performWrite(updateFn, firebaseFn);
    };
    
    const deleteInventoryItem = async (itemId: string) => {
        if (!shipId || !mainCollectionId) return;
        const updateFn = () => {
            setInventory(prev => {
                const updated = prev.filter(item => item.id !== itemId);
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const shipDocRef = doc(db, mainCollectionId, shipId);
        const firebaseFn = () => deleteDoc(doc(shipDocRef, 'inventory', itemId));
        await performWrite(updateFn, firebaseFn);
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        if (!shipId || !mainCollectionId) return;
        const newActivityId = `act_${Date.now()}`;
        const newActivity = { ...activityData, id: newActivityId, timestamp: activityData.timestamp.toISOString() };

        const updateFn = () => {
            setActivityLog(prev => {
                const updated = [newActivity as any, ...prev].sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
                setLocalData(`activityLog_${shipId}`, updated);
                return updated;
            });
        };
        const shipDocRef = doc(db, mainCollectionId, shipId);
        const firebaseFn = () => setDoc(doc(shipDocRef, 'activityLog', newActivityId), { ...activityData, timestamp: Timestamp.fromDate(activityData.timestamp) });
        await performWrite(updateFn, firebaseFn);
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        if (!shipId || !mainCollectionId) return;
        const updateFn = () => {
            setLogbookSections(sections);
            setLocalData(`logbookSections_${shipId}`, sections);
        };
        const shipDocRef = doc(db, mainCollectionId, shipId);
        const firebaseFn = () => setDoc(doc(shipDocRef, 'config', 'logbook'), { sections });
        await performWrite(updateFn, firebaseFn);
    };
    
    const loading = authLoading || settingsLoading || inventoryLoading || logsLoading || activityLogLoading || logbookLoading;

    const data: DataContextType = {
        settings,
        logbookSections,
        inventory,
        logs,
        activityLog,
        updateSettings,
        addLog,
        deleteLog,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        addActivityLog,
        updateLogbookSections,
        settingsLoading,
        inventoryLoading,
        logsLoading,
        activityLogLoading,
        logbookLoading,
        isSyncing,
        syncWithFirebase,
        loading,
    };

    return (
        <DataContext.Provider value={data}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
