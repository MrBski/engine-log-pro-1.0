
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
    getInitialData, 
    type AppSettings, 
    type EngineLog, 
    type InventoryItem,
    type ActivityLog, 
    type LogSection 
} from '@/lib/data';
import { db } from '@/lib/firebase';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, doc, setDoc, addDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { useAuth } from './use-auth';

interface DataContextType {
  settings: AppSettings | undefined;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  
  logs: EngineLog[] | undefined;
  addLog: (log: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;

  inventory: InventoryItem[] | undefined;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  
  activityLog: ActivityLog[] | undefined;
  addActivityLog: (activity: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<void>;

  logbookSections: LogSection[] | undefined;
  updateLogbookSections: (sections: LogSection[]) => Promise<void>;

  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    useEffect(() => {
        setIsFirebaseReady(!!db);
    }, []);

    // Settings
    const settingsRef = isFirebaseReady ? doc(db, 'app-data', 'settings') : null;
    const [settings, loadingSettings, errorSettings] = useDocumentData(settingsRef);
    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        if (!settingsRef) return;
        await setDoc(settingsRef, newSettings, { merge: true });
    };

    // Logs
    const logsCol = isFirebaseReady ? collection(db, 'logs') : null;
    const logsQuery = logsCol ? query(logsCol, orderBy('timestamp', 'desc')) : null;
    const [logs, loadingLogs, errorLogs] = useCollectionData(logsQuery, { idField: 'id' });
    const addLog = async (log: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        if (!logsCol) return;
        const newLog = {
            ...log,
            timestamp: Timestamp.fromDate(log.timestamp),
        }
        await addDoc(logsCol, newLog);
    };
    const deleteLog = async (logId: string) => {
        if (!db) return;
        await deleteDoc(doc(db, 'logs', logId));
    };

    // Inventory
    const invCol = isFirebaseReady ? collection(db, 'inventory') : null;
    const [inventory, loadingInv, errorInv] = useCollectionData(invCol, { idField: 'id' });
    const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
        if (!invCol) return;
        await addDoc(invCol, item);
    };
    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        if (!db) return;
        await setDoc(doc(db, 'inventory', itemId), updates, { merge: true });
    };

    // Activity Log
    const activityCol = isFirebaseReady ? collection(db, 'activity') : null;
    const activityQuery = activityCol ? query(activityCol, orderBy('timestamp', 'desc')) : null;
    const [activityLog, loadingActivity, errorActivity] = useCollectionData(activityQuery, { idField: 'id' });
    const addActivityLog = async (activity: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        if (!activityCol) return;
        const newActivity = {
            ...activity,
            timestamp: Timestamp.fromDate(activity.timestamp),
        }
        await addDoc(activityCol, newActivity);
    };
    
    // Logbook Sections
    const logbookRef = isFirebaseReady ? doc(db, 'app-data', 'logbookSections') : null;
    const [logbookData, loadingLogbook, errorLogbook] = useDocumentData(logbookRef);
    const updateLogbookSections = async (sections: LogSection[]) => {
        if (!logbookRef) return;
        await setDoc(logbookRef, { sections });
    };

    if (!isFirebaseReady) {
        // Don't try to render anything that depends on Firebase if it's not ready.
        // The AuthProvider will show a more specific error message.
        return null;
    }

    if (errorSettings || errorLogs || errorInv || errorActivity || errorLogbook) {
        if(errorSettings) console.error("Firestore settings error:", errorSettings);
        if(errorLogs) console.error("Firestore logs error:", errorLogs);
        if(errorInv) console.error("Firestore inventory error:", errorInv);
        if(errorActivity) console.error("Firestore activity log error:", errorActivity);
        if(errorLogbook) console.error("Firestore logbook sections error:", errorLogbook);
        return <div className="flex h-screen items-center justify-center">Error loading data. Check console for details.</div>;
    }

    const loading = loadingSettings || loadingLogs || loadingInv || loadingActivity || loadingLogbook;
    
    const initialData = getInitialData();
    const data: DataContextType = {
        settings: settings || initialData.settings,
        updateSettings,
        logs: logs as EngineLog[] || initialData.logs,
        addLog,
        deleteLog,
        inventory: inventory as InventoryItem[] || initialData.inventory,
        addInventoryItem,
        updateInventoryItem,
        activityLog: activityLog as ActivityLog[] || initialData.activityLog,
        addActivityLog,
        logbookSections: logbookData?.sections || initialData.logbookSections,
        updateLogbookSections,
        loading,
    }


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
