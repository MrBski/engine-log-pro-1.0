
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
    Timestamp,
    query,
    orderBy,
    onSnapshot,
    Unsubscribe,
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

// THE SHARED DOCUMENT ID FOR THE ENTIRE SHIP
const SHIP_DATA_ID = "ship-data";

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

  loading: boolean;
  isSyncing: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const isGuest = !user || user.uid === 'guest-user';

    // --- LOCAL STATE is the Single Source of Truth for the UI ---
    // Initialize with default data to make the UI responsive immediately
    const [settings, setSettings] = useState<AppSettings>(getInitialData().settings);
    const [inventory, setInventory] = useState<InventoryItem[]>(getInitialData().inventory);
    const [logs, setLogs] = useState<EngineLog[]>(getInitialData().logs);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>(getInitialData().activityLog);
    const [logbookSections, setLogbookSections] = useState<LogSection[]>(getInitialData().logbookSections);
    
    // Loading and sync states
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(true);
    const [activityLogLoading, setActivityLogLoading] = useState(true);
    const [logbookLoading, setLogbookLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    useEffect(() => {
        if (authLoading) return;

        // Reset to initial data for guests and stop any listeners
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
            setIsSyncing(false);
            
            return;
        }

        // For logged-in users, set up REAL-TIME listeners
        if (db) {
            setIsSyncing(true);
            const unsubscribes: Unsubscribe[] = [];
            const shipDocRef = doc(db, SHIP_DATA_ID, "singleton");

            // Main document for settings
            unsubscribes.push(onSnapshot(shipDocRef, (snap) => {
                const data = snap.exists() ? convertDocTimestamps(snap.data()) : getInitialData().settings;
                setSettings(data as AppSettings);
                setSettingsLoading(false);
            }, (error) => {
                console.error("Settings listener error:", error);
                setSettingsLoading(false);
            }));

            // Inventory listener
            const inventoryRef = collection(shipDocRef, 'inventory');
            unsubscribes.push(onSnapshot(inventoryRef, (snap) => {
                const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryItem[];
                setInventory(items.sort((a,b) => a.name.localeCompare(b.name)));
                setInventoryLoading(false);
            }, (error) => {
                console.error("Inventory listener error:", error);
                setInventoryLoading(false);
            }));

            // Logs listener
            const logsQuery = query(collection(shipDocRef, 'logs'), orderBy('timestamp', 'desc'));
            unsubscribes.push(onSnapshot(logsQuery, (snap) => {
                setLogs(snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as EngineLog[]);
                setLogsLoading(false);
            }, (error) => {
                console.error("Logs listener error:", error);
                setLogsLoading(false);
            }));

            // ActivityLog listener
            const activityQuery = query(collection(shipDocRef, 'activityLog'), orderBy('timestamp', 'desc'));
            unsubscribes.push(onSnapshot(activityQuery, (snap) => {
                setActivityLog(snap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as ActivityLog[]);
                setActivityLogLoading(false);
            }, (error) => {
                console.error("ActivityLog listener error:", error);
                setActivityLogLoading(false);
            }));

            // Logbook sections listener
            const logbookRef = doc(shipDocRef, 'config', 'logbook');
            unsubscribes.push(onSnapshot(logbookRef, (snap) => {
                setLogbookSections((snap.exists() ? snap.data().sections : getInitialData().logbookSections) as LogSection[]);
                setLogbookLoading(false);
            }, (error) => {
                console.error("Logbook listener error:", error);
                setLogbookLoading(false);
            }));

            Promise.all([
              snap => !snap.metadata.fromCache,
            ]).then(() => {
                setIsSyncing(false);
            })

            return () => {
                unsubscribes.forEach(unsub => unsub());
            };
        }

    }, [isGuest, authLoading]);

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        // Optimistic update for instant UI feedback
        setSettings(prev => ({ ...(prev || getInitialData().settings), ...newSettings } as AppSettings));
        if (!isGuest && db) {
            const shipDocRef = doc(db, SHIP_DATA_ID, "singleton");
            await setDoc(shipDocRef, newSettings, { merge: true });
        }
    };

    const addLog = async (logData: Omit<EngineLog, 'id'>) => {
        const tempId = `log-${Date.now()}`;
        const newLog: EngineLog = { ...logData, id: tempId };
        setLogs(prev => [newLog, ...prev].sort((a,b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()));
        
        if (!isGuest && db) {
            const shipDocRef = doc(db, SHIP_DATA_ID, "singleton");
            const docRef = await addDoc(collection(shipDocRef, 'logs'), {
                ...logData,
                timestamp: Timestamp.fromDate(logData.timestamp),
            });
            // Although we get a new ID, onSnapshot will handle the update correctly.
            return docRef.id;
        }
        return tempId;
    };
    
    const deleteLog = async (logId: string) => {
        setLogs(prev => prev.filter(l => l.id !== logId));
        if (!isGuest && db) {
            const shipDocRef = doc(db, SHIP_DATA_ID, "singleton");
            await deleteDoc(doc(shipDocRef, 'logs', logId));
        }
    };

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        const newItem: InventoryItem = { ...itemData, id: `inv-${Date.now()}` };
        setInventory(prev => [newItem, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
        if (!isGuest && db) {
            const shipDocRef = doc(db, SHIP_DATA_ID, "singleton");
            await addDoc(collection(shipDocRef, 'inventory'), itemData);
        }
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        setInventory(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
        if (!isGuest && db) {
            const shipDocRef = doc(db, SHIP_DATA_ID, "singleton");
            await updateDoc(doc(shipDocRef, 'inventory', itemId), updates);
        }
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        const newActivity = { ...activityData, id: `act-${Date.now()}` } as ActivityLog;
        setActivityLog(prev => [newActivity, ...prev].sort((a,b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()));
        if (!isGuest && db) {
            const shipDocRef = doc(db, SHIP_DATA_ID, "singleton");
            await addDoc(collection(shipDocRef, 'activityLog'), {
                ...activityData,
                timestamp: Timestamp.fromDate(activityData.timestamp)
            });
        }
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        setLogbookSections(sections);
        if (!isGuest && db) {
            const shipDocRef = doc(db, SHIP_DATA_ID, "singleton");
            await setDoc(doc(shipDocRef, 'config', 'logbook'), { sections });
        }
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
        addActivityLog,
        updateLogbookSections,
        loading,
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
