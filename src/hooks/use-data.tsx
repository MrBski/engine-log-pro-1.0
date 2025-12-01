
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
        if (data !== null && typeof data === 'object') {
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

const MAIN_COLLECTION = 'TB.SMS16011';

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

    const shipId = user?.shipId || "guest-ship";
    
    const loadLocalData = useCallback(() => {
        const currentShipId = user?.shipId || 'guest-ship';
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
        if (!user || user.uid === 'guest-user' || !db || !navigator.onLine) {
            if (!isSilent) toast({ title: "Sync Failed", description: "You are offline or not logged in.", variant: "destructive" });
            return;
        }
        setIsSyncing(true);
        if (!isSilent) toast({ title: "Syncing...", description: "Fetching latest data from server." });

        try {
            const shipDocRef = doc(db, MAIN_COLLECTION, shipId);
            
            let settingsSnap = await getDoc(shipDocRef);

            // If ship document doesn't exist, create it with initial data
            if (!settingsSnap.exists()) {
                toast({ title: "New Setup", description: "Initializing database for this ship." });
                const initialData = getInitialData();
                const batch = writeBatch(db);

                batch.set(shipDocRef, initialData.settings);
                batch.set(doc(shipDocRef, 'config', 'logbook'), { sections: initialData.logbookSections });
                
                await batch.commit();

                // Re-fetch the settings snapshot
                settingsSnap = await getDoc(shipDocRef);
            }
            
            const logbookSnap = await getDoc(doc(shipDocRef, 'config', 'logbook'));
            
            const [inventorySnap, logsSnap, activityLogSnap] = await Promise.all([
                getDocs(query(collection(shipDocRef, 'inventory'))),
                getDocs(query(collection(shipDocRef, 'logs'))),
                getDocs(query(collection(shipDocRef, 'activityLog'))),
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

        } catch (error) {
            console.error("Firebase sync failed:", error);
            if (!isSilent) toast({ title: "Sync Error", description: "Could not fetch data from Firebase.", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    }, [user, shipId, toast]);

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
    }, [user, syncWithFirebase]); // Dependency array is crucial


    const performWrite = async (
        updateLocalState: () => void,
        firebaseWriteFn?: () => Promise<any>
    ) => {
        updateLocalState(); // Always update UI and local storage immediately
        if (db && user && user.uid !== 'guest-user' && navigator.onLine && firebaseWriteFn) {
            try {
                await firebaseWriteFn();
            } catch (error) {
                console.error("Firebase write failed, but data is saved locally:", error);
                toast({ title: "Sync Failed", description: "Could not save to server. Data is saved locally.", variant: 'destructive'});
            }
        }
    };
    
    // --- Mutators ---

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        const updateFn = () => {
            setSettings(prev => {
                const updated = { ...(prev || getInitialData().settings), ...newSettings };
                setLocalData(`settings_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => setDoc(doc(db, MAIN_COLLECTION, shipId), newSettings, { merge: true });
        await performWrite(updateFn, firebaseFn);
    };

    const addLog = async (logData: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        const newLogId = `log_${Date.now()}`;
        const newLog = { ...logData, id: newLogId, timestamp: logData.timestamp.toISOString() };
        
        const updateFn = () => {
            setLogs(prev => {
                const updated = [newLog as EngineLog, ...prev].sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
                setLocalData(`logs_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => setDoc(doc(db, MAIN_COLLECTION, shipId, 'logs', newLogId), { ...logData, timestamp: Timestamp.fromDate(logData.timestamp) });
        
        await performWrite(updateFn, firebaseFn);
        return newLogId;
    };
    
    const deleteLog = async (logId: string) => {
        const updateFn = () => {
            setLogs(prev => {
                const updated = prev.filter(l => l.id !== logId);
                setLocalData(`logs_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => deleteDoc(doc(db, MAIN_COLLECTION, shipId, 'logs', logId));
        await performWrite(updateFn, firebaseFn);
    };

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        const newItemId = `inv_${Date.now()}`;
        const newItem = { ...itemData, id: newItemId };
        
        const updateFn = () => {
            setInventory(prev => {
                const updated = [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name));
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => setDoc(doc(db, MAIN_COLLECTION, shipId, 'inventory', newItemId), itemData);
        await performWrite(updateFn, firebaseFn);
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        const updateFn = () => {
            setInventory(prev => {
                const updated = prev.map(item => item.id === itemId ? { ...item, ...updates } : item);
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => updateDoc(doc(db, MAIN_COLLECTION, shipId, 'inventory', itemId), updates);
        await performWrite(updateFn, firebaseFn);
    };
    
    const deleteInventoryItem = async (itemId: string) => {
        const updateFn = () => {
            setInventory(prev => {
                const updated = prev.filter(item => item.id !== itemId);
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => deleteDoc(doc(db, MAIN_COLLECTION, shipId, 'inventory', itemId));
        await performWrite(updateFn, firebaseFn);
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        const newActivityId = `act_${Date.now()}`;
        const newActivity = { ...activityData, id: newActivityId, timestamp: activityData.timestamp.toISOString() };

        const updateFn = () => {
            setActivityLog(prev => {
                const updated = [newActivity as ActivityLog, ...prev].sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
                setLocalData(`activityLog_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => setDoc(doc(db, MAIN_COLLECTION, shipId, 'activityLog', newActivityId), { ...activityData, timestamp: Timestamp.fromDate(activityData.timestamp) });
        await performWrite(updateFn, firebaseFn);
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        const updateFn = () => {
            setLogbookSections(sections);
            setLocalData(`logbookSections_${shipId}`, sections);
        };
        const firebaseFn = () => setDoc(doc(db, MAIN_COLLECTION, shipId, 'config', 'logbook'), { sections });
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

    
    