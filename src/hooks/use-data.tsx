
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

// Helper to safely convert Firestore Timestamps to JS Dates in any object
const convertDocTimestamps = (docData: any): any => {
    if (!docData) return docData;
    const data = { ...docData };
    for (const key in data) {
        if (data.hasOwnProperty(key) && data[key] && typeof data[key].toDate === 'function') {
            data[key] = data[key].toDate();
        }
    }
    return data;
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
  inventoryLoading: boolean;
  
  activityLog: ActivityLog[];
  addActivityLog: (activity: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<void>;
  activityLogLoading: boolean;

  logbookSections: LogSection[] | undefined;
  updateLogbookSections: (sections: LogSection[]) => Promise<void>;
  logbookLoading: boolean;

  loading: boolean; // General loading for initial app start
  isSyncing: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const isGuest = !user || user.uid === 'guest-user';

    // --- LOCAL STATE is the Single Source of Truth for the UI ---
    const [settings, setSettings] = useState<AppSettings>();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<EngineLog[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [logbookSections, setLogbookSections] = useState<LogSection[]>();
    
    // Loading and sync states
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(true);
    const [activityLogLoading, setActivityLogLoading] = useState(true);
    const [logbookLoading, setLogbookLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDataInitialized, setIsDataInitialized] = useState(false);


    // --- EFFECT: Initialize data and set up real-time listeners for logged-in users ---
    useEffect(() => {
        if (authLoading) return; // Wait for authentication to resolve

        // Set initial data for guests
        if (isGuest) {
            const initialData = getInitialData();
            setSettings(initialData.settings);
            setInventory(initialData.inventory);
            setLogs(initialData.logs);
            setActivityLog(initialData.activityLog);
            setLogbookSections(initialData.logbookSections);
            setSettingsLoading(false);
            setInventoryLoading(false);
            setLogsLoading(false);
            setActivityLogLoading(false);
            setLogbookLoading(false);
            setIsDataInitialized(true);
            return; // Stop here for guests
        }

        // For logged-in users
        if (db && user?.uid) {
            setIsSyncing(true); // Start syncing indicator

            const unsubscribes: Unsubscribe[] = [];

            // Settings listener
            const settingsRef = doc(db, 'users', user.uid);
            unsubscribes.push(onSnapshot(settingsRef, (snap) => {
                setSettings((snap.exists() ? snap.data() : getInitialData().settings) as AppSettings);
                setSettingsLoading(false);
            }));

            // Inventory listener
            const inventoryRef = collection(db, 'users', user.uid, 'inventory');
            unsubscribes.push(onSnapshot(inventoryRef, (snap) => {
                const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryItem[];
                setInventory(items.sort((a,b) => a.name.localeCompare(b.name)));
                setInventoryLoading(false);
            }));

            // Logs listener
            const logsQuery = query(collection(db, 'users', user.uid, 'logs'), orderBy('timestamp', 'desc'));
            unsubscribes.push(onSnapshot(logsQuery, (snap) => {
                setLogs(snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as EngineLog[]);
                setLogsLoading(false);
            }));

            // ActivityLog listener
            const activityQuery = query(collection(db, 'users', user.uid, 'activityLog'), orderBy('timestamp', 'desc'));
            unsubscribes.push(onSnapshot(activityQuery, (snap) => {
                setActivityLog(snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as ActivityLog[]);
                setActivityLogLoading(false);
            }));

            // Logbook sections listener
            const logbookRef = doc(db, 'users', user.uid, 'config', 'logbook');
            unsubscribes.push(onSnapshot(logbookRef, (snap) => {
                setLogbookSections((snap.exists() ? snap.data().sections : getInitialData().logbookSections) as LogSection[]);
                setLogbookLoading(false);
            }));

            setIsDataInitialized(true);
            
            // Once all initial loading is false, stop the sync indicator
            // This is a simplification; a more robust solution might use Promise.all on first fetch
            setTimeout(() => setIsSyncing(false), 2000); // Simulate initial sync time

            // Cleanup listeners on unmount or user change
            return () => {
                unsubscribes.forEach(unsub => unsub());
            };
        }

    }, [user, isGuest, authLoading]);


    // --- MUTATION FUNCTIONS: They update local state FIRST, then sync to Firebase ---

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        // Optimistically update local state for faster UI response
        setSettings(prev => ({ ...(prev || getInitialData().settings), ...newSettings, id: user?.uid || 'local' } as AppSettings));

        if (!isGuest && db && user?.uid) {
            await setDoc(doc(db, 'users', user.uid), newSettings, { merge: true });
        }
    };

    const addLog = async (logData: Omit<EngineLog, 'id'>) => {
        const tempId = `log-${Date.now()}`;
        // Optimistic update not needed as onSnapshot will handle it
        
        if (!isGuest && db && user?.uid) {
            const docRef = await addDoc(collection(db, 'users', user.uid, 'logs'), {
                ...logData,
                timestamp: Timestamp.fromDate(logData.timestamp),
            });
            return docRef.id;
        } else {
             const newLog: EngineLog = { ...logData, id: tempId };
             setLogs(prev => [newLog, ...prev]);
        }
        return tempId;
    };
    
    const deleteLog = async (logId: string) => {
        if (!isGuest && db && user?.uid) {
            await deleteDoc(doc(db, 'users', user.uid, 'logs', logId));
        } else {
             setLogs(prev => prev.filter(l => l.id !== logId));
        }
    };

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        if (!isGuest && db && user?.uid) {
            await addDoc(collection(db, 'users', user.uid, 'inventory'), itemData);
        } else {
            const newItem: InventoryItem = { ...itemData, id: `inv-${Date.now()}` };
            setInventory(prev => [newItem, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
        }
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        if (!isGuest && db && user?.uid) {
            await updateDoc(doc(db, 'users', user.uid, 'inventory', itemId), updates);
        } else {
             setInventory(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
        }
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        if (!isGuest && db && user?.uid) {
            await addDoc(collection(db, 'users', user.uid, 'activityLog'), {
                ...activityData,
                timestamp: Timestamp.fromDate(activityData.timestamp)
            });
        } else {
            const newActivity = { ...activityData, id: `act-${Date.now()}` } as ActivityLog;
            setActivityLog(prev => [newActivity, ...prev]);
        }
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        if (!isGuest && db && user?.uid) {
            await setDoc(doc(db, 'users', user.uid, 'config', 'logbook'), { sections });
        } else {
            setLogbookSections(sections);
        }
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
        addActivityLog,
        updateLogbookSections,
        loading: authLoading || !isDataInitialized,
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

