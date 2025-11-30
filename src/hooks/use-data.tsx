
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
    onSnapshot,
    Unsubscribe,
} from 'firebase/firestore';
import {
    type AppSettings,
    type EngineLog,
    type InventoryItem,
    type ActivityLog,
    type LogSection,
    getInitialData,
} from '@/lib/data';

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Functions to interact with localStorage
const getLocalData = (key: string, defaultValue: any) => {
    if (typeof window === 'undefined') return defaultValue;
    const saved = localStorage.getItem(key);
    // Ensure timestamps stored as strings are converted to Date objects
    try {
      const parsed = saved ? JSON.parse(saved) : defaultValue;
      return convertTimestampsInLocalStorage(parsed);
    } catch (e) {
        console.error("Failed to parse local data for key:", key, e);
        return defaultValue;
    }
};

const setLocalData = (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
};

const convertTimestampsInLocalStorage = (data: any): any => {
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(data)) {
        return new Date(data);
    }
    if (Array.isArray(data)) {
        return data.map(convertTimestampsInLocalStorage);
    }
    if (data !== null && typeof data === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newObj[key] = convertTimestampsInLocalStorage(data[key]);
            }
        }
        return newObj;
    }
    return data;
};


export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    
    // Hardcoded shipId for guest/single-tenant mode
    const shipId = "guest-ship";
    
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

    const loadLocalData = useCallback(() => {
        const initialData = getInitialData();
        setSettings(getLocalData(`settings_${shipId}`, initialData.settings));
        setInventory(getLocalData(`inventory_${shipId}`, initialData.inventory));
        setLogs(getLocalData(`logs_${shipId}`, initialData.logs));
        const activities = getLocalData(`activityLog_${shipId}`, initialData.activityLog);
        setActivityLog(activities.sort((a: ActivityLog, b: ActivityLog) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()));
        setLogbookSections(getLocalData(`logbookSections_${shipId}`, initialData.logbookSections));
        
        setSettingsLoading(false);
        setInventoryLoading(false);
        setLogsLoading(false);
        setActivityLogLoading(false);
        setLogbookLoading(false);
    }, [shipId]);

    const syncLocalToFirebase = useCallback(async () => {
        if (!db || !user || user.uid === 'guest-user') return;
        
        console.log("Starting sync from local to Firebase...");
        setIsSyncing(true);

        try {
            const batch = writeBatch(db);
            const shipDocRef = doc(db, "ships", shipId);
            
            // Sync settings
            const localSettings = getLocalData(`settings_${shipId}`, null);
            if (localSettings) {
                batch.set(shipDocRef, localSettings, { merge: true });
            }

            // Sync logbook config
            const localLogbook = getLocalData(`logbookSections_${shipId}`, null);
            if (localLogbook) {
                 batch.set(doc(shipDocRef, 'config', 'logbook'), { sections: localLogbook });
            }
            
            // Sync collections
            const collectionsToSync = ['inventory', 'logs', 'activityLog'];
            for (const collName of collectionsToSync) {
                const localItems = getLocalData(`${collName}_${shipId}`, []);
                for (const item of localItems) {
                    const docRef = doc(collection(shipDocRef, collName), item.id);
                    batch.set(docRef, item);
                }
            }

            await batch.commit();
            console.log("Sync successful!");
        } catch (error) {
            console.error("Error syncing data to Firebase:", error);
        } finally {
            setIsSyncing(false);
        }
    }, [user, shipId]);


    useEffect(() => {
        if (authLoading) return;

        const isLoggedIn = user && user.uid !== 'guest-user';
        
        if (!isLoggedIn || !db) {
            loadLocalData();
            return; // Stop here for guest users or if firebase is off
        }

        // --- Logged-in user logic ---
        syncLocalToFirebase(); // Sync local changes on login

        const unsubscribes: Unsubscribe[] = [];
        const shipDocRef = doc(db, "ships", shipId);
        setIsSyncing(true);

        // Settings
        unsubscribes.push(onSnapshot(shipDocRef, (snap) => {
            const data = snap.exists() ? convertDocTimestamps(snap.data()) : getInitialData().settings;
            setSettings(data as AppSettings);
            setLocalData(`settings_${shipId}`, data);
            setSettingsLoading(false);
        }));

        // Inventory
        unsubscribes.push(onSnapshot(collection(shipDocRef, 'inventory'), (snap) => {
            const items = snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as InventoryItem[];
            setInventory(items.sort((a, b) => a.name.localeCompare(b.name)));
            setLocalData(`inventory_${shipId}`, items);
            setInventoryLoading(false);
        }));

        // Logs
        const logsQuery = query(collection(shipDocRef, 'logs'), orderBy('timestamp', 'desc'));
        unsubscribes.push(onSnapshot(logsQuery, (snap) => {
            const logsData = snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as EngineLog[];
            setLogs(logsData);
            setLocalData(`logs_${shipId}`, logsData);
            setLogsLoading(false);
        }));

        // Activity Log
        const activityQuery = query(collection(shipDocRef, 'activityLog'), orderBy('timestamp', 'desc'));
        unsubscribes.push(onSnapshot(activityQuery, (snap) => {
            const activities = snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as ActivityLog[];
            setActivityLog(activities);
            setLocalData(`activityLog_${shipId}`, activities);
            setActivityLogLoading(false);
        }));

        // Logbook Sections
        unsubscribes.push(onSnapshot(doc(shipDocRef, 'config', 'logbook'), (snap) => {
            const sections = (snap.exists() ? snap.data().sections : getInitialData().logbookSections) as LogSection[];
            setLogbookSections(sections);
            setLocalData(`logbookSections_${shipId}`, sections);
            setLogbookLoading(false);
        }));
        
        // This is a rough way to check if initial sync is done.
        Promise.all([
           getDoc(shipDocRef),
           getDocs(collection(shipDocRef, 'inventory')),
        ]).finally(() => setIsSyncing(false));

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user, authLoading, loadLocalData, shipId, syncLocalToFirebase]);

    const performWrite = async (localUpdateFn: (currentData?: any) => any, firebaseWriteFn?: (shipDocRef: any) => Promise<any>, collectionKey?: string) => {
        if (collectionKey) {
            const currentLocalData = getLocalData(`${collectionKey}_${shipId}`, []);
            const updatedData = localUpdateFn(currentLocalData);
            setLocalData(`${collectionKey}_${shipId}`, updatedData);
        } else {
            const updatedData = localUpdateFn();
            // This is for settings/logbook which are not collections
        }
        
        if (db && user && user.uid !== 'guest-user' && firebaseWriteFn) {
            try {
                const shipDocRef = doc(db, "ships", shipId);
                await firebaseWriteFn(shipDocRef);
            } catch(error) {
                console.error("Firebase write failed:", error);
                // The change is already saved locally, so it will sync later.
            }
        }
    };
    
    // --- Mutators ---

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        const localUpdateFn = () => {
            const current = settings ? { ...settings } : { ...getInitialData().settings };
            const updated = { ...current, ...newSettings };
            setSettings(updated);
            setLocalData(`settings_${shipId}`, updated);
            return updated;
        };
        const firebaseWriteFn = () => setDoc(doc(db, "ships", shipId), newSettings, { merge: true });
        await performWrite(localUpdateFn, firebaseWriteFn);
    };

    const addLog = async (logData: Omit<EngineLog, 'id'>) => {
        const newLogId = `log_${Date.now()}`;
        const newLog = { ...logData, id: newLogId, timestamp: logData.timestamp };
        
        setLogs(prev => [newLog, ...prev].sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()) as EngineLog[]);
        
        const localUpdateFn = (current: EngineLog[]) => [newLog, ...current];
        const firebaseWriteFn = (shipDocRef: any) => setDoc(doc(shipDocRef, 'logs', newLogId), { ...logData, timestamp: Timestamp.fromDate(logData.timestamp) });
        
        await performWrite(localUpdateFn, firebaseWriteFn, 'logs');
        return newLogId;
    };
    
    const deleteLog = async (logId: string) => {
        setLogs(prev => prev.filter(l => l.id !== logId));
        const localUpdateFn = (current: EngineLog[]) => current.filter(l => l.id !== logId);
        const firebaseWriteFn = (shipDocRef: any) => deleteDoc(doc(shipDocRef, 'logs', logId));
        await performWrite(localUpdateFn, firebaseWriteFn, 'logs');
    };

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        const newItemId = `inv_${Date.now()}`;
        const newItem = { ...itemData, id: newItemId };
        
        setInventory(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
        
        const localUpdateFn = (current: InventoryItem[]) => [...current, newItem];
        const firebaseWriteFn = (shipDocRef: any) => setDoc(doc(shipDocRef, 'inventory', newItemId), itemData);
        await performWrite(localUpdateFn, firebaseWriteFn, 'inventory');
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        setInventory(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
        const localUpdateFn = (current: InventoryItem[]) => current.map(item => item.id === itemId ? { ...item, ...updates } : item);
        const firebaseWriteFn = (shipDocRef: any) => updateDoc(doc(shipDocRef, 'inventory', itemId), updates);
        await performWrite(localUpdateFn, firebaseWriteFn, 'inventory');
    };
    
    const deleteInventoryItem = async (itemId: string) => {
        setInventory(prev => prev.filter(item => item.id !== itemId));
        const localUpdateFn = (current: InventoryItem[]) => current.filter(item => item.id !== itemId);
        const firebaseWriteFn = (shipDocRef: any) => deleteDoc(doc(shipDocRef, 'inventory', itemId));
        await performWrite(localUpdateFn, firebaseWriteFn, 'inventory');
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        const newActivityId = `act_${Date.now()}`;
        const newActivity = { ...activityData, id: newActivityId, timestamp: activityData.timestamp };

        setActivityLog(prev => [newActivity, ...prev].sort((a,b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()) as ActivityLog[]);
        
        const localUpdateFn = (current: ActivityLog[]) => [newActivity, ...current];
        const firebaseWriteFn = (shipDocRef: any) => setDoc(doc(shipDocRef, 'activityLog', newActivityId), { ...activityData, timestamp: Timestamp.fromDate(activityData.timestamp) });
        await performWrite(localUpdateFn, firebaseWriteFn, 'activityLog');
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        setLogbookSections(sections);
        const localUpdateFn = () => setLocalData(`logbookSections_${shipId}`, sections);
        const firebaseWriteFn = () => setDoc(doc(db, "ships", shipId, 'config', 'logbook'), { sections });
        await performWrite(localUpdateFn, firebaseWriteFn);
    };
    
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
