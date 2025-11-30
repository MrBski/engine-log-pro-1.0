
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
  loading: boolean; // General loading state
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

    const loadInitialData = useCallback(() => {
        const initialData = getInitialData();
        const shipIdToLoad = user?.shipId || "guest-ship";

        setSettings(getLocalData(`settings_${shipIdToLoad}`, initialData.settings));
        setInventory(getLocalData(`inventory_${shipIdToLoad}`, initialData.inventory));
        setLogs(getLocalData(`logs_${shipIdToLoad}`, initialData.logs));
        const activities = getLocalData(`activityLog_${shipIdToLoad}`, initialData.activityLog);
        setActivityLog(activities.sort((a: ActivityLog, b: ActivityLog) => (new Date(b.timestamp as string)).getTime() - (new Date(a.timestamp as string)).getTime()));
        setLogbookSections(getLocalData(`logbookSections_${shipIdToLoad}`, initialData.logbookSections));
        
        setSettingsLoading(false);
        setInventoryLoading(false);
        setLogsLoading(false);
        setActivityLogLoading(false);
        setLogbookLoading(false);
    }, [user?.shipId]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const syncLocalToFirebase = useCallback(async () => {
        if (!db || !user || user.uid === 'guest-user') return;
        
        console.log("Starting sync from local to Firebase...");
        setIsSyncing(true);

        try {
            const batch = writeBatch(db);
            const shipDocRef = doc(db, "ships", shipId);
            
            const localSettings = getLocalData(`settings_${shipId}`, null);
            if (localSettings) batch.set(shipDocRef, localSettings, { merge: true });

            const localLogbook = getLocalData(`logbookSections_${shipId}`, null);
            if (localLogbook) batch.set(doc(shipDocRef, 'config', 'logbook'), { sections: localLogbook });
            
            const collectionsToSync = ['inventory', 'logs', 'activityLog'];
            for (const collName of collectionsToSync) {
                const localItems = getLocalData(`${collName}_${shipId}`, []);
                const fsQuery = query(collection(shipDocRef, collName));
                const fsSnap = await getDocs(fsQuery);
                const fsIds = new Set(fsSnap.docs.map(d => d.id));
                
                for (const item of localItems) {
                    if (!fsIds.has(item.id)) {
                        console.log(`Syncing new item ${item.id} to ${collName}`);
                        const docRef = doc(collection(shipDocRef, collName), item.id);
                        batch.set(docRef, item);
                    }
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
            loadInitialData(); // Ensure local data is loaded for guest
            return;
        }

        // --- Logged-in user logic ---
        syncLocalToFirebase();

        const unsubscribes: Unsubscribe[] = [];
        const shipDocRef = doc(db, "ships", shipId);
        setIsSyncing(true);

        const setupListener = <T,>(collName: string, stateSetter: React.Dispatch<React.SetStateAction<T[]>>, loadingSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
            const q = query(collection(shipDocRef, collName), orderBy('timestamp', 'desc'));
            return onSnapshot(q, (snap) => {
                const items = snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as T[];
                stateSetter(items);
                setLocalData(`${collName}_${shipId}`, items);
                loadingSetter(false);
            }, (error) => {
                console.error(`Error on ${collName} listener:`, error);
                loadingSetter(false);
            });
        };
        
        // Settings
        unsubscribes.push(onSnapshot(shipDocRef, (snap) => {
            const data = snap.exists() ? convertDocTimestamps(snap.data()) : getInitialData().settings;
            setSettings(data as AppSettings);
            setLocalData(`settings_${shipId}`, data);
            setSettingsLoading(false);
        }));

        // Inventory (sorted by name)
        unsubscribes.push(onSnapshot(collection(shipDocRef, 'inventory'), (snap) => {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryItem[];
            const sortedItems = items.sort((a,b) => a.name.localeCompare(b.name));
            setInventory(sortedItems);
            setLocalData(`inventory_${shipId}`, sortedItems);
            setInventoryLoading(false);
        }));

        // Logs
        unsubscribes.push(setupListener<EngineLog>('logs', setLogs, setLogsLoading));
        
        // Activity Log
        unsubscribes.push(setupListener<ActivityLog>('activityLog', setActivityLog, setActivityLogLoading));

        // Logbook Sections
        unsubscribes.push(onSnapshot(doc(shipDocRef, 'config', 'logbook'), (snap) => {
            const sections = (snap.exists() ? snap.data().sections : getInitialData().logbookSections) as LogSection[];
            setLogbookSections(sections);
            setLocalData(`logbookSections_${shipId}`, sections);
            setLogbookLoading(false);
        }));
        
        Promise.all([
           getDoc(shipDocRef),
           getDocs(collection(shipDocRef, 'inventory')),
        ]).finally(() => setIsSyncing(false));

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user, authLoading, shipId, loadInitialData, syncLocalToFirebase]);

    const performWrite = async (
        updateLocalState: () => void,
        localDataKey: string,
        firebaseWriteFn?: () => Promise<any>
    ) => {
        // Optimistically update UI
        updateLocalState();

        if (db && user && user.uid !== 'guest-user' && firebaseWriteFn) {
            try {
                await firebaseWriteFn();
            } catch (error) {
                console.error("Firebase write failed, but data is saved locally:", error);
                // Data is already saved locally and will sync on next app load
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
        const firebaseFn = () => setDoc(doc(db, "ships", shipId), newSettings, { merge: true });
        await performWrite(updateFn, `settings_${shipId}`, firebaseFn);
    };

    const addLog = async (logData: Omit<EngineLog, 'id'>) => {
        const newLogId = `log_${Date.now()}`;
        const newLog = { ...logData, id: newLogId };
        
        const updateFn = () => {
            setLogs(prev => {
                const updated = [newLog as EngineLog, ...prev].sort((a, b) => (new Date(b.timestamp as string)).getTime() - (new Date(a.timestamp as string)).getTime());
                setLocalData(`logs_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => setDoc(doc(db, 'ships', shipId, 'logs', newLogId), { ...logData, timestamp: Timestamp.fromDate(logData.timestamp) });
        
        await performWrite(updateFn, `logs_${shipId}`, firebaseFn);
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
        const firebaseFn = () => deleteDoc(doc(db, 'ships', shipId, 'logs', logId));
        await performWrite(updateFn, `logs_${shipId}`, firebaseFn);
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
        const firebaseFn = () => setDoc(doc(db, 'ships', shipId, 'inventory', newItemId), itemData);
        await performWrite(updateFn, `inventory_${shipId}`, firebaseFn);
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        const updateFn = () => {
            setInventory(prev => {
                const updated = prev.map(item => item.id === itemId ? { ...item, ...updates } : item);
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => updateDoc(doc(db, 'ships', shipId, 'inventory', itemId), updates);
        await performWrite(updateFn, `inventory_${shipId}`, firebaseFn);
    };
    
    const deleteInventoryItem = async (itemId: string) => {
        const updateFn = () => {
            setInventory(prev => {
                const updated = prev.filter(item => item.id !== itemId);
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => deleteDoc(doc(db, 'ships', shipId, 'inventory', itemId));
        await performWrite(updateFn, `inventory_${shipId}`, firebaseFn);
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        const newActivityId = `act_${Date.now()}`;
        const newActivity = { ...activityData, id: newActivityId };

        const updateFn = () => {
            setActivityLog(prev => {
                const updated = [newActivity as ActivityLog, ...prev].sort((a, b) => (new Date(b.timestamp as string)).getTime() - (new Date(a.timestamp as string)).getTime());
                setLocalData(`activityLog_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => setDoc(doc(db, 'ships', shipId, 'activityLog', newActivityId), { ...activityData, timestamp: Timestamp.fromDate(activityData.timestamp) });
        await performWrite(updateFn, `activityLog_${shipId}`, firebaseFn);
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        const updateFn = () => {
            setLogbookSections(sections);
            setLocalData(`logbookSections_${shipId}`, sections);
        };
        const firebaseFn = () => setDoc(doc(db, "ships", shipId, 'config', 'logbook'), { sections });
        await performWrite(updateFn, `logbookSections_${shipId}`, firebaseFn);
    };
    
    const loading = settingsLoading || inventoryLoading || logsLoading || activityLogLoading || logbookLoading;

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
