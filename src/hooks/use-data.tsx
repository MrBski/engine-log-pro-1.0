
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
import { collection, doc, setDoc, addDoc, deleteDoc, Timestamp, query, orderBy, writeBatch } from 'firebase/firestore';
import { useAuth } from './use-auth';

interface DataContextType {
  settings: AppSettings | undefined;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  
  logs: EngineLog[] | undefined;
  addLog: (log: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<string | undefined>;
  deleteLog: (logId: string) => Promise<void>;

  inventory: InventoryItem[] | undefined;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  
  activityLog: ActivityLog[] | undefined;
  addActivityLog: (activity: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date; logId?: string }) => Promise<void>;

  logbookSections: LogSection[] | undefined;
  updateLogbookSections: (sections: LogSection[]) => Promise<void>;

  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: isAuthLoading } = useAuth();
    
    // Defer creating refs until firebase is ready AND user is logged in
    const settingsRef = db && user ? doc(db, 'app-data', 'settings') : null;
    const logbookRef = db && user ? doc(db, 'app-data', 'logbookSections') : null;
    const logsCol = db && user ? collection(db, 'logs') : null;
    const invCol = db && user ? collection(db, 'inventory') : null;
    const activityCol = db && user ? collection(db, 'activity') : null;

    // Pass the ref (which can be null) to the hooks. They will only fetch when the ref is not null.
    const [settings, loadingSettings, errorSettings] = useDocumentData(settingsRef);
    const [logbookData, loadingLogbook, errorLogbook] = useDocumentData(logbookRef);
    const logsQuery = logsCol ? query(logsCol, orderBy('timestamp', 'desc')) : null;
    const [logs, loadingLogs, errorLogs] = useCollectionData(logsQuery, { idField: 'id' });
    const invQuery = invCol ? query(invCol, orderBy('name')) : null;
    const [inventory, loadingInv, errorInv] = useCollectionData(invQuery, { idField: 'id' });
    const activityQuery = activityCol ? query(activityCol, orderBy('timestamp', 'desc')) : null;
    const [activityLog, loadingActivity, errorActivity] = useCollectionData(activityQuery, { idField: 'id' });

    // This effect initializes the database with default data if it's empty
    useEffect(() => {
        if (db && user && !loadingSettings && settings === undefined) {
             const initializeData = async () => {
                console.log("Attempting to initialize data...");
                const initial = getInitialData();
                const batch = writeBatch(db);

                // Check settings and logbookData again right before writing
                if (settings === undefined && settingsRef) {
                    console.log("Initializing settings document...");
                    batch.set(settingsRef, initial.settings);
                }
                if (logbookData === undefined && logbookRef) {
                    console.log("Initializing logbookSections document...");
                    batch.set(logbookRef, { sections: initial.logbookSections });
                }

                await batch.commit().catch(e => console.error("Failed to initialize data:", e));
            };
            
            initializeData();
        }
    }, [user, settings, logbookData, loadingSettings, db, settingsRef, logbookRef]);


    // --- Functions ---
    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        if (!settingsRef) return;
        await setDoc(settingsRef, newSettings, { merge: true });
    };

    const addLog = async (log: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        if (!logsCol) return;
        const newLog = {
            ...log,
            timestamp: Timestamp.fromDate(log.timestamp),
        }
        const docRef = await addDoc(logsCol, newLog);
        return docRef.id;
    };
    
    const deleteLog = async (logId: string) => {
        if (!db || !user) return;
        await deleteDoc(doc(db, 'logs', logId));
    };

    const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
        if (!invCol) return;
        await addDoc(invCol, item);
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        if (!db || !user) return;
        await setDoc(doc(db, 'inventory', itemId), updates, { merge: true });
    };

    const addActivityLog = async (activity: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        if (!activityCol) return;
        const newActivity = {
            ...activity,
            timestamp: Timestamp.fromDate(activity.timestamp),
        }
        await addDoc(activityCol, newActivity);
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        if (!logbookRef) return;
        await setDoc(logbookRef, { sections });
    };
    
    const anyError = user && (errorSettings || errorLogs || errorInv || errorActivity || errorLogbook);
    if (anyError) {
        if(errorSettings) console.error("Firestore settings error:", errorSettings);
        if(errorLogs) console.error("Firestore logs error:", errorLogs);
        if(errorInv) console.error("Firestore inventory error:", errorInv);
        if(errorActivity) console.error("Firestore activity log error:", errorActivity);
        if(errorLogbook) console.error("Firestore logbook sections error:", errorLogbook);
        return (
            <div className="flex h-screen items-center justify-center bg-background p-4 text-center">
                <div>
                    <h2 className="text-xl font-bold text-destructive">Error Loading Data</h2>
                    <p className="text-muted-foreground">Could not connect to the database. <br/> Please check the browser console for details.</p>
                </div>
            </div>
        );
    }
    
    // Overall loading is true if auth is loading, OR if the user is logged in and ANY data is still loading.
    const loading = isAuthLoading || (!!user && (loadingSettings || loadingLogs || loadingInv || loadingActivity || loadingLogbook));
    
    // If not logged in, provide initial data structure with undefined values to prevent UI flicker with old data.
    const initialData = getInitialData();
    const data: DataContextType = user 
      ? {
        settings,
        updateSettings,
        logs: logs as EngineLog[],
        addLog,
        deleteLog,
        inventory: inventory as InventoryItem[],
        addInventoryItem,
        updateInventoryItem,
        activityLog: activityLog as ActivityLog[],
        addActivityLog,
        logbookSections: logbookData?.sections,
        updateLogbookSections,
        loading,
      }
      : {
        settings: initialData.settings,
        logs: [],
        inventory: [],
        activityLog: [],
        logbookSections: initialData.logbookSections,
        updateSettings: async () => {},
        addLog: async () => undefined,
        deleteLog: async () => {},
        addInventoryItem: async () => {},
        updateInventoryItem: async () => {},
        addActivityLog: async () => {},
        updateLogbookSections: async () => {},
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

    