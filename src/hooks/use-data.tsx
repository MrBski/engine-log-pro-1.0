
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    addDoc,
    deleteDoc,
    updateDoc,
    setDoc,
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
        if (data.hasOwnProperty(key) && data[key] instanceof Timestamp) {
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

  isSyncing: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    // We will use a single, hardcoded ID for all data, reverting the multi-tenant logic.
    const shipId = "guest-ship";

    const [settings, setSettings] = useState<AppSettings>(getInitialData().settings);
    const [inventory, setInventory] = useState<InventoryItem[]>(getInitialData().inventory);
    const [logs, setLogs] = useState<EngineLog[]>(getInitialData().logs);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>(getInitialData().activityLog);
    const [logbookSections, setLogbookSections] = useState<LogSection[]>(getInitialData().logbookSections);
    
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(true);
    const [activityLogLoading, setActivityLogLoading] = useState(true);
    const [logbookLoading, setLogbookLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    useEffect(() => {
        // This effect will now depend on `user` object change to re-evaluate.
        // It will setup listeners for logged-in users and clear them for guests.
        if (authLoading) return;

        // If firebase is not configured or user is a guest, use initial offline data.
        if (!db || !user || user.uid === 'guest-user') {
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
            setIsSyncing(false);
            return;
        }

        // For logged-in users, set up REAL-TIME listeners to a single data source.
        setIsSyncing(true);
        const unsubscribes: Unsubscribe[] = [];
        
        // The path is now hardcoded to a single document for the entire app.
        const shipDocRef = doc(db, "ships", shipId);

        unsubscribes.push(onSnapshot(shipDocRef, (snap) => {
            const data = snap.exists() ? convertDocTimestamps(snap.data()) : getInitialData().settings;
            setSettings(data as AppSettings);
            setSettingsLoading(false);
        }, (error) => {
            console.error("Settings listener error:", error);
            setSettingsLoading(false);
        }));

        const inventoryRef = collection(shipDocRef, 'inventory');
        unsubscribes.push(onSnapshot(inventoryRef, (snap) => {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryItem[];
            setInventory(items.sort((a,b) => a.name.localeCompare(b.name)));
            setInventoryLoading(false);
        }, (error) => {
            console.error("Inventory listener error:", error);
            setInventoryLoading(false);
        }));

        const logsQuery = query(collection(shipDocRef, 'logs'), orderBy('timestamp', 'desc'));
        unsubscribes.push(onSnapshot(logsQuery, (snap) => {
            setLogs(snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as EngineLog[]);
            setLogsLoading(false);
        }, (error) => {
            console.error("Logs listener error:", error);
            setLogsLoading(false);
        }));

        const activityQuery = query(collection(shipDocRef, 'activityLog'), orderBy('timestamp', 'desc'));
        unsubscribes.push(onSnapshot(activityQuery, (snap) => {
            setActivityLog(snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as ActivityLog[]);
            setActivityLogLoading(false);
        }, (error) => {
            console.error("ActivityLog listener error:", error);
            setActivityLogLoading(false);
        }));

        const logbookRef = doc(shipDocRef, 'config', 'logbook');
        unsubscribes.push(onSnapshot(logbookRef, (snap) => {
            setLogbookSections((snap.exists() ? snap.data().sections : getInitialData().logbookSections) as LogSection[]);
            setLogbookLoading(false);
        }, (error) => {
            console.error("Logbook listener error:", error);
            setLogbookLoading(false);
        }));
        
        const allLoadedCheck = () => {
            if (!settingsLoading && !inventoryLoading && !logsLoading && !activityLogLoading && !logbookLoading) {
                setIsSyncing(false);
            }
        };
        allLoadedCheck();


        return () => {
            unsubscribes.forEach(unsub => unsub());
        };

    }, [user, authLoading]); // Rerun when user or authLoading changes.

    const performWrite = async (writeFn: (shipDocRef: any) => Promise<any>) => {
        if (!db || !user || user.uid === 'guest-user') return;
        const shipDocRef = doc(db, "ships", shipId);
        await writeFn(shipDocRef);
    };

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        await performWrite(() => setDoc(doc(db, "ships", shipId), newSettings, { merge: true }));
    };

    const addLog = async (logData: Omit<EngineLog, 'id'>) => {
        let docRefId;
        await performWrite(async (shipDocRef) => {
            const docRef = await addDoc(collection(shipDocRef, 'logs'), {
                ...logData,
                timestamp: Timestamp.fromDate(logData.timestamp),
            });
            docRefId = docRef.id;
        });
        return docRefId;
    };
    
    const deleteLog = async (logId: string) => {
        await performWrite((shipDocRef) => deleteDoc(doc(shipDocRef, 'logs', logId)));
    };

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        await performWrite((shipDocRef) => addDoc(collection(shipDocRef, 'inventory'), itemData));
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        await performWrite((shipDocRef) => updateDoc(doc(shipDocRef, 'inventory', itemId), updates));
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        await performWrite((shipDocRef) => addDoc(collection(shipDocRef, 'activityLog'), {
            ...activityData,
            timestamp: Timestamp.fromDate(activityData.timestamp)
        }));
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        await performWrite(() => setDoc(doc(db, "ships", shipId, 'config', 'logbook'), { sections }));
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
