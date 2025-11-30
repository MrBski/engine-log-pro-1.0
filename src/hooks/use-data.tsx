
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
    serverTimestamp,
    query,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { useDocumentData, useCollectionData } from 'react-firebase-hooks/firestore';
import {
    type AppSettings,
    type EngineLog,
    type InventoryItem,
    type ActivityLog,
    type LogSection,
    getInitialData,
} from '@/lib/data';

// Helper to safely convert Firestore Timestamps to JS Dates
const safeToDate = (firestoreTimestamp: any): Date | null => {
  if (!firestoreTimestamp) return null;
  if (firestoreTimestamp instanceof Date) return firestoreTimestamp;
  if (firestoreTimestamp.toDate && typeof firestoreTimestamp.toDate === 'function') {
    return firestoreTimestamp.toDate();
  }
  return new Date(firestoreTimestamp); // Fallback for strings/numbers
};

const convertDocTimestamps = (doc: any) => {
    if (!doc) return doc;
    const data = { ...doc };
    if (data.timestamp) {
        data.timestamp = safeToDate(data.timestamp);
    }
    return data;
}

interface DataContextType {
  settings: AppSettings | undefined;
  updateSettings: (newSettings: Partial<Omit<AppSettings, 'id'>>) => Promise<void>;
  
  logs: EngineLog[];
  addLog: (log: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<string | undefined>;
  deleteLog: (logId: string) => Promise<void>;

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  
  activityLog: ActivityLog[];
  addActivityLog: (activity: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<void>;

  logbookSections: LogSection[] | undefined;
  updateLogbookSections: (sections: LogSection[]) => Promise<void>;

  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const isGuest = !user || user.uid === 'guest-user';

    // --- LOCAL STATE for Guest Mode ---
    const [localSettings, setLocalSettings] = useState<AppSettings>();
    const [localInventory, setLocalInventory] = useState<InventoryItem[]>([]);
    const [localLogs, setLocalLogs] = useState<EngineLog[]>([]);
    const [localActivityLog, setLocalActivityLog] = useState<ActivityLog[]>([]);
    const [localLogbookSections, setLocalLogbookSections] = useState<LogSection[]>();
    const [isDataInitialized, setIsDataInitialized] = useState(false);

    // --- FIREBASE HOOKS for Logged-in User ---
    const settingsRef = useMemo(() => (db && !isGuest) ? doc(db, 'users', user.uid) : null, [isGuest, user]);
    const [settingsDoc, settingsLoading, settingsError] = useDocumentData(settingsRef);

    const inventoryRef = useMemo(() => (db && !isGuest) ? collection(db, 'users', user.uid, 'inventory') : null, [isGuest, user]);
    const [inventoryCol, inventoryLoading, inventoryError] = useCollectionData(inventoryRef, { idField: 'id' });

    const logsQuery = useMemo(() => (db && !isGuest) ? query(collection(db, 'users', user.uid, 'logs'), orderBy('timestamp', 'desc')) : null, [isGuest, user]);
    const [logsCol, logsLoading, logsError] = useCollectionData(logsQuery, { idField: 'id' });
    
    const activityQuery = useMemo(() => (db && !isGuest) ? query(collection(db, 'users', user.uid, 'activityLog'), orderBy('timestamp', 'desc')) : null, [isGuest, user]);
    const [activityCol, activityLoading, activityError] = useCollectionData(activityQuery, { idField: 'id' });

    const logbookRef = useMemo(() => (db && !isGuest) ? doc(db, 'users', user.uid, 'config', 'logbook') : null, [isGuest, user]);
    const [logbookDoc, logbookLoading, logbookError] = useDocumentData(logbookRef);


    // Initialize local data for guest mode
    useEffect(() => {
        if (!isDataInitialized && isGuest) {
            const initialData = getInitialData();
            setLocalSettings(initialData.settings);
            setLocalInventory(initialData.inventory);
            setLocalLogs(initialData.logs);
            setLocalActivityLog(initialData.activityLog);
            setLocalLogbookSections(initialData.logbookSections);
            setIsDataInitialized(true);
        }
    }, [isDataInitialized, isGuest]);

    // --- DATA CONVERSION & SELECTION ---

    const logs = useMemo(() => {
        if (isGuest) return localLogs;
        if (!logsCol) return [];
        return logsCol.map(log => convertDocTimestamps(log)) as EngineLog[];
    }, [isGuest, localLogs, logsCol]);
    
    const activityLog = useMemo(() => {
        if (isGuest) return localActivityLog;
        if (!activityCol) return [];
        return activityCol.map(activity => convertDocTimestamps(activity)) as ActivityLog[];
    }, [isGuest, localActivityLog, activityCol]);

    const inventory = isGuest ? localInventory : (inventoryCol as InventoryItem[] || []);
    
    const settings = useMemo(() => {
        if (isGuest) return localSettings;
        return settingsDoc as AppSettings | undefined;
    }, [isGuest, localSettings, settingsDoc]);
    
    const logbookSections = useMemo(() => {
        if (isGuest) return localLogbookSections;
        return (logbookDoc?.sections || getInitialData().logbookSections) as LogSection[] | undefined;
    }, [isGuest, localLogbookSections, logbookDoc]);
    

    // --- MUTATION FUNCTIONS ---
    
    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        if (isGuest) {
            setLocalSettings(prev => ({ ...(prev || getInitialData().settings), ...newSettings }));
            return;
        }
        if (settingsRef) {
            await setDoc(settingsRef, newSettings, { merge: true });
        }
    };

    const addLog = async (logData: Omit<EngineLog, 'id'>) => {
        if (isGuest) {
            const newLogId = `log-${Date.now()}`;
            const newLog: EngineLog = { ...logData, id: newLogId };
            setLocalLogs(prev => [newLog, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
            return newLogId;
        }
        if (db && !isGuest) {
            const newDoc = await addDoc(collection(db, 'users', user.uid, 'logs'), {
                ...logData,
                timestamp: Timestamp.fromDate(logData.timestamp),
            });
            return newDoc.id;
        }
    };
    
    const deleteLog = async (logId: string) => {
        if (isGuest) {
            setLocalLogs(prev => prev.filter(l => l.id !== logId));
            setLocalActivityLog(prev => prev.filter(a => !(a.type === 'engine' && a.logId === logId)));
            return;
        }
        if (db && !isGuest) {
            await deleteDoc(doc(db, 'users', user.uid, 'logs', logId));
            // Deleting related activity logs would require a query, which is more complex.
            // For now, we'll just delete the main log.
        }
    };

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        if (isGuest) {
            const newItem: InventoryItem = { ...itemData, id: `inv-${Date.now()}` };
            setLocalInventory(prev => [newItem, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
            return;
        }
        if (db && !isGuest) {
            await addDoc(collection(db, 'users', user.uid, 'inventory'), itemData);
        }
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        if (isGuest) {
            setLocalInventory(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
            return;
        }
        if (db && !isGuest) {
            await updateDoc(doc(db, 'users', user.uid, 'inventory', itemId), updates);
        }
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id'>) => {
        if (isGuest) {
            const newActivity = { ...activityData, id: `act-${Date.now()}` } as ActivityLog;
            setLocalActivityLog(prev => [newActivity, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
            return;
        }
        if (db && !isGuest) {
            await addDoc(collection(db, 'users', user.uid, 'activityLog'), {
                ...activityData,
                timestamp: Timestamp.fromDate(activityData.timestamp)
            });
        }
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        if (isGuest) {
            setLocalLogbookSections(sections);
            return;
        }
        if (logbookRef) {
            await setDoc(logbookRef, { sections });
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
        loading: authLoading || (isGuest ? !isDataInitialized : settingsLoading || inventoryLoading || logsLoading || activityLoading || logbookLoading),
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
