
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
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
    writeBatch
} from 'firebase/firestore';
import {
    type AppSettings,
    type EngineLog,
    type InventoryItem,
    type ActivityLog,
    type LogSection,
    getInitialData,
} from '@/lib/data';

// Helper to safely convert Firestore Timestamps to JS Dates
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

  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const isGuest = !user || user.uid === 'guest-user';

    // --- LOCAL STATE is now the Single Source of Truth for the UI ---
    const [settings, setSettings] = useState<AppSettings>();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<EngineLog[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [logbookSections, setLogbookSections] = useState<LogSection[]>();
    const [isDataInitialized, setIsDataInitialized] = useState(false);
    
    // Individual loading states for better UX
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(true);
    const [activityLogLoading, setActivityLogLoading] = useState(true);
    const [logbookLoading, setLogbookLoading] = useState(true);

    // --- EFFECT 1: Initialize data for guest or fetch from Firebase for logged-in user ---
    useEffect(() => {
        const initializeData = async () => {
            if (isGuest) {
                // GUEST MODE: Load initial data locally
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
            } else if (db && user?.uid) {
                // LOGGED-IN MODE: Fetch all data from Firestore ONCE
                setSettingsLoading(true);
                setInventoryLoading(true);
                setLogsLoading(true);
                setActivityLogLoading(true);
                setLogbookLoading(true);

                const settingsRef = doc(db, 'users', user.uid);
                const inventoryRef = collection(db, 'users', user.uid, 'inventory');
                const logsQuery = query(collection(db, 'users', user.uid, 'logs'), orderBy('timestamp', 'desc'));
                const activityQuery = query(collection(db, 'users', user.uid, 'activityLog'), orderBy('timestamp', 'desc'));
                const logbookRef = doc(db, 'users', user.uid, 'config', 'logbook');

                const [settingsSnap, inventorySnap, logsSnap, activitySnap, logbookSnap] = await Promise.all([
                    getDoc(settingsRef),
                    getDocs(inventoryRef),
                    getDocs(logsQuery),
                    getDocs(activityQuery),
                    getDoc(logbookRef),
                ]);

                setSettings((settingsSnap.exists() ? settingsSnap.data() : getInitialData().settings) as AppSettings);
                setInventory(inventorySnap.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryItem[]);
                setLogs(logsSnap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as EngineLog[]);
                setActivityLog(activitySnap.docs.map(d => convertDocTimestamps({ id: d.id, ...d.data() })) as ActivityLog[]);
                setLogbookSections((logbookSnap.exists() ? logbookSnap.data().sections : getInitialData().logbookSections) as LogSection[]);
                
                setSettingsLoading(false);
                setInventoryLoading(false);
                setLogsLoading(false);
                setActivityLogLoading(false);
                setLogbookLoading(false);
                setIsDataInitialized(true);
            }
        };

        if (!authLoading) {
            initializeData();
        }
    }, [user, isGuest, authLoading]);


    // --- MUTATION FUNCTIONS: They update local state FIRST, then sync to Firebase ---

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        // Optimistically update local state
        const updatedSettings = { ...(settings || getInitialData().settings), ...newSettings, id: user?.uid || 'local' };
        setSettings(updatedSettings as AppSettings);

        if (!isGuest && db && user?.uid) {
            await setDoc(doc(db, 'users', user.uid), newSettings, { merge: true });
        }
    };

    const addLog = async (logData: Omit<EngineLog, 'id'>) => {
        const newLogId = `log-${Date.now()}`;
        const newLog: EngineLog = { ...logData, id: newLogId, timestamp: new Date(logData.timestamp) };
        
        // Optimistically update local state
        setLogs(prev => [newLog, ...prev]);

        if (!isGuest && db && user?.uid) {
            // Sync to Firebase in the background
            const docRef = await addDoc(collection(db, 'users', user.uid, 'logs'), {
                ...logData,
                timestamp: Timestamp.fromDate(logData.timestamp),
            });
            // Optional: update local log with real Firebase ID
            setLogs(prev => prev.map(l => l.id === newLogId ? { ...l, id: docRef.id } : l));
            return docRef.id;
        }
        return newLogId;
    };
    
    const deleteLog = async (logId: string) => {
        // Optimistically update local state
        setLogs(prev => prev.filter(l => l.id !== logId));
        setActivityLog(prev => prev.filter(a => !(a.type === 'engine' && a.logId === logId)));

        if (!isGuest && db && user?.uid) {
            await deleteDoc(doc(db, 'users', user.uid, 'logs', logId));
        }
    };

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        const newItemId = `inv-${Date.now()}`;
        const newItem: InventoryItem = { ...itemData, id: newItemId };
        
        // Optimistically update local state
        setInventory(prev => [newItem, ...prev].sort((a, b) => a.name.localeCompare(b.name)));

        if (!isGuest && db && user?.uid) {
            const docRef = await addDoc(collection(db, 'users', user.uid, 'inventory'), itemData);
            setInventory(prev => prev.map(i => i.id === newItemId ? { ...i, id: docRef.id } : i));
        }
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        // Optimistically update local state
        setInventory(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));

        if (!isGuest && db && user?.uid) {
            await updateDoc(doc(db, 'users', user.uid, 'inventory', itemId), updates);
        }
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        const newActivityId = `act-${Date.now()}`;
        const newActivity = { ...activityData, id: newActivityId, timestamp: new Date(activityData.timestamp) } as ActivityLog;
       
        // Optimistically update local state
        setActivityLog(prev => [newActivity, ...prev]);

        if (!isGuest && db && user?.uid) {
            const docRef = await addDoc(collection(db, 'users', user.uid, 'activityLog'), {
                ...activityData,
                timestamp: Timestamp.fromDate(activityData.timestamp)
            });
            setActivityLog(prev => prev.map(a => a.id === newActivityId ? { ...a, id: docRef.id } as ActivityLog : a));
        }
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        // Optimistically update local state
        setLogbookSections(sections);

        if (!isGuest && db && user?.uid) {
            await setDoc(doc(db, 'users', user.uid, 'config', 'logbook'), { sections });
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
