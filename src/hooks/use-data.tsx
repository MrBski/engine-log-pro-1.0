
'use client';

import React, { createContext, useContext, ReactNode, useEffect, useMemo } from 'react';
import { useAuth } from './use-auth';
import { 
    collection, 
    query, 
    orderBy, 
    addDoc, 
    doc,
    deleteDoc,
    updateDoc,
    setDoc,
    Timestamp,
    where,
} from 'firebase/firestore';
import { useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';
import { 
    type AppSettings, 
    type EngineLog, 
    type InventoryItem,
    type ActivityLog, 
    type LogSection,
    getInitialData, 
} from '@/lib/data';

// Helper function to safely convert Firestore Timestamps
const convertTimestamps = (data: any) => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  if (typeof data === 'object' && data !== null) {
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      if (data[key] instanceof Timestamp) {
        newObj[key] = data[key].toDate();
      } else {
        newObj[key] = convertTimestamps(data[key]);
      }
    }
    return newObj;
  }
  return data;
};


interface DataContextType {
  settings: AppSettings | undefined;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  
  logs: EngineLog[];
  addLog: (log: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<string>;
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
    const initialData = getInitialData();
    
    // Firestore Hooks
    const settingsRef = user ? doc(db!, 'settings', 'main') : null;
    const [settingsDoc, settingsLoading, settingsError] = useDocumentData(settingsRef);

    const logbookRef = user ? doc(db!, 'logbook', 'sections') : null;
    const [logbookDoc, logbookLoading, logbookError] = useDocumentData(logbookRef);
    
    const inventoryQuery = user ? query(collection(db!, `users/${user.uid}/inventory`), orderBy('name', 'asc')) : null;
    const [inventoryCol, inventoryLoading, inventoryError] = useCollectionData(inventoryQuery, { idField: 'id' });

    const logsQuery = user ? query(collection(db!, `users/${user.uid}/logs`), orderBy('timestamp', 'desc')) : null;
    const [logsCol, logsLoading, logsError] = useCollectionData(logsQuery, { idField: 'id' });

    const activityQuery = user ? query(collection(db!, `users/${user.uid}/activityLog`), orderBy('timestamp', 'desc')) : null;
    const [activityCol, activityLoading, activityError] = useCollectionData(activityQuery, { idField: 'id' });

    // Memoize and convert data to prevent re-renders and fix timestamp issues
    const settings = useMemo(() => convertTimestamps(settingsDoc) as AppSettings | undefined, [settingsDoc]);
    const logbookSections = useMemo(() => (logbookDoc?.sections ? convertTimestamps(logbookDoc.sections) : undefined) as LogSection[] | undefined, [logbookDoc]);
    const inventory = useMemo(() => convertTimestamps(inventoryCol) as InventoryItem[] | undefined, [inventoryCol]);
    const logs = useMemo(() => convertTimestamps(logsCol) as EngineLog[] | undefined, [logsCol]);
    const activityLog = useMemo(() => convertTimestamps(activityCol) as ActivityLog[] | undefined, [activityCol]);


    const loading = authLoading || settingsLoading || logbookLoading || inventoryLoading || logsLoading || activityLoading;

    // --- MUTATION FUNCTIONS ---
    
    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        if (!user || !db) return;
        const settingsRef = doc(db, 'settings', 'main');
        await setDoc(settingsRef, newSettings, { merge: true });
    };

    const addLog = async (log: Omit<EngineLog, 'id'>) => {
        if (!user || !db) throw new Error("User not authenticated or DB not available");
        const logsCollection = collection(db, `users/${user.uid}/logs`);
        const docRef = await addDoc(logsCollection, log);
        return docRef.id;
    };
    
    const deleteLog = async (logId: string) => {
        if (!user || !db) return;
        // Delete the log
        await deleteDoc(doc(db, `users/${user.uid}/logs`, logId));
        
        // Find and delete the associated activity log
        const activityQuery = query(collection(db, `users/${user.uid}/activityLog`), where("logId", "==", logId));
        const { getDocs } = await import('firebase/firestore');
        const activitySnapshot = await getDocs(activityQuery);
        activitySnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
    };

    const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
        if (!user || !db) return;
        await addDoc(collection(db, `users/${user.uid}/inventory`), item);
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        if (!user || !db) return;
        await updateDoc(doc(db, `users/${user.uid}/inventory`, itemId), updates);
    };

    const addActivityLog = async (activity: Omit<ActivityLog, 'id'>) => {
        if (!user || !db) return;
        await addDoc(collection(db, `users/${user.uid}/activityLog`), activity);
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        if (!user || !db) return;
        const logbookRef = doc(db, 'logbook', 'sections');
        await setDoc(logbookRef, { sections });
    };
    
    const data: DataContextType = {
        settings: settings === undefined ? initialData.settings : settings,
        logbookSections: logbookSections === undefined ? initialData.logbookSections : logbookSections,
        inventory: inventory || [],
        logs: logs || [],
        activityLog: activityLog || [],
        updateSettings,
        addLog,
        deleteLog,
        addInventoryItem,
        updateInventoryItem,
        addActivityLog,
        updateLogbookSections,
        loading: user ? loading : authLoading,
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
