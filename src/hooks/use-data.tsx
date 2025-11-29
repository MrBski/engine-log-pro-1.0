
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
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

    // Settings
    const settingsRef = doc(db, 'app-data', 'settings');
    const [settings, loadingSettings, errorSettings] = useDocumentData(settingsRef);
    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        await setDoc(settingsRef, newSettings, { merge: true });
    };

    // Logs
    const logsCol = collection(db, 'logs');
    const logsQuery = query(logsCol, orderBy('timestamp', 'desc'));
    const [logs, loadingLogs, errorLogs] = useCollectionData(logsQuery, { idField: 'id' });
    const addLog = async (log: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        const newLog = {
            ...log,
            timestamp: Timestamp.fromDate(log.timestamp),
        }
        await addDoc(logsCol, newLog);
    };
    const deleteLog = async (logId: string) => {
        await deleteDoc(doc(db, 'logs', logId));
        // Also delete associated activity log if needed
        // This requires a query, which can be complex. For now, we leave orphaned activities.
    };

    // Inventory
    const invCol = collection(db, 'inventory');
    const [inventory, loadingInv, errorInv] = useCollectionData(invCol, { idField: 'id' });
    const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
        await addDoc(invCol, item);
    };
    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        await setDoc(doc(db, 'inventory', itemId), updates, { merge: true });
    };

    // Activity Log
    const activityCol = collection(db, 'activity');
    const activityQuery = query(activityCol, orderBy('timestamp', 'desc'));
    const [activityLog, loadingActivity, errorActivity] = useCollectionData(activityQuery, { idField: 'id' });
    const addActivityLog = async (activity: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        const newActivity = {
            ...activity,
            timestamp: Timestamp.fromDate(activity.timestamp),
        }
        await addDoc(activityCol, newActivity);
    };
    
    // Logbook Sections (stored as a single document)
    const logbookRef = doc(db, 'app-data', 'logbookSections');
    const [logbookData, loadingLogbook, errorLogbook] = useDocumentData(logbookRef);
    const updateLogbookSections = async (sections: LogSection[]) => {
        await setDoc(logbookRef, { sections });
    };


    if (errorSettings || errorLogs || errorInv || errorActivity || errorLogbook) {
        if(errorSettings) console.error("Firestore settings error:", errorSettings);
        if(errorLogs) console.error("Firestore logs error:", errorLogs);
        if(errorInv) console.error("Firestore inventory error:", errorInv);
        if(errorActivity) console.error("Firestore activity log error:", errorActivity);
        if(errorLogbook) console.error("Firestore logbook sections error:", errorLogbook);
        return <div className="flex h-screen items-center justify-center">Error loading data. Check console for details.</div>;
    }

    // Combine all loading states
    const loading = loadingSettings || loadingLogs || loadingInv || loadingActivity || loadingLogbook;
    
    // Use initial data as fallback while loading or if data is undefined
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
