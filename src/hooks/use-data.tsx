
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
    getDocs,
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
const convertTimestamps = (data: any): any => {
  if (!data) return data;

  if (data instanceof Timestamp) {
    return data.toDate();
  }

  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }

  if (typeof data === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
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
    
    // Determine if we should be using Firebase
    const useFirebase = !!user;

    // --- Firestore Hooks ---
    const settingsRef = useFirebase ? doc(db!, 'settings', 'main') : null;
    const [settingsDoc, settingsLoading, settingsError] = useDocumentData(settingsRef);

    const logbookRef = useFirebase ? doc(db!, 'logbook', 'sections') : null;
    const [logbookDoc, logbookLoading, logbookError] = useDocumentData(logbookRef);
    
    const inventoryQuery = useFirebase ? query(collection(db!, `users/${user.uid}/inventory`), orderBy('name', 'asc')) : null;
    const [inventoryCol, inventoryLoading, inventoryError] = useCollectionData(inventoryQuery, { idField: 'id' });

    const logsQuery = useFirebase ? query(collection(db!, `users/${user.uid}/logs`), orderBy('timestamp', 'desc')) : null;
    const [logsCol, logsLoading, logsError] = useCollectionData(logsQuery, { idField: 'id' });

    const activityQuery = useFirebase ? query(collection(db!, `users/${user.uid}/activityLog`), orderBy('timestamp', 'desc')) : null;
    const [activityCol, activityLoading, activityError] = useCollectionData(activityQuery, { idField: 'id' });

    // --- Proactive Data Conversion ---
    const settings = useMemo(() => convertTimestamps(settingsDoc), [settingsDoc]);
    const logbookSections = useMemo(() => logbookDoc?.sections ? convertTimestamps(logbookDoc.sections) : undefined, [logbookDoc]);
    const inventory = useMemo(() => convertTimestamps(inventoryCol) as InventoryItem[], [inventoryCol]);
    const logs = useMemo(() => convertTimestamps(logsCol) as EngineLog[], [logsCol]);
    const activityLog = useMemo(() => convertTimestamps(activityCol) as ActivityLog[], [activityCol]);

    const loading = authLoading || (useFirebase && (settingsLoading || logbookLoading || inventoryLoading || logsLoading || activityLoading));

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
        await deleteDoc(doc(db, `users/${user.uid}/logs`, logId));
        
        const activityQueryRef = query(collection(db, `users/${user.uid}/activityLog`), where("logId", "==", logId));
        const activitySnapshot = await getDocs(activityQueryRef);
        activitySnapshot.forEach(async (docToDelete) => {
            await deleteDoc(docToDelete.ref);
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
        settings: useFirebase ? settings : initialData.settings,
        logbookSections: useFirebase ? logbookSections : initialData.logbookSections,
        inventory: useFirebase ? (inventory || []) : initialData.inventory,
        logs: useFirebase ? (logs || []) : initialData.logs,
        activityLog: useFirebase ? (activityLog || []) : initialData.activityLog,
        updateSettings,
        addLog,
        deleteLog,
        addInventoryItem,
        updateInventoryItem,
        addActivityLog,
        updateLogbookSections,
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
