
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

    // --- References ---
    const settingsRef = isFirebaseReady ? doc(db, 'app-data', 'settings') : null;
    const logbookRef = isFirebaseReady ? doc(db, 'app-data', 'logbookSections') : null;
    const logsCol = isFirebaseReady ? collection(db, 'logs') : null;
    const invCol = isFirebaseReady ? collection(db, 'inventory') : null;
    const activityCol = isFirebaseReady ? collection(db, 'activity') : null;

    // --- Hooks ---
    const [settings, loadingSettings, errorSettings] = useDocumentData(settingsRef);
    const [logbookData, loadingLogbook, errorLogbook] = useDocumentData(logbookRef);
    const logsQuery = logsCol ? query(logsCol, orderBy('timestamp', 'desc')) : null;
    const [logs, loadingLogs, errorLogs] = useCollectionData(logsQuery, { idField: 'id' });
    const [inventory, loadingInv, errorInv] = useCollectionData(invCol, { idField: 'id' });
    const activityQuery = activityCol ? query(activityCol, orderBy('timestamp', 'desc')) : null;
    const [activityLog, loadingActivity, errorActivity] = useCollectionData(activityQuery, { idField: 'id' });

    // This effect initializes the database with default data if it's empty
    useEffect(() => {
        if (db && !loadingSettings && !loadingLogbook && user) {
            const batch = writeBatch(db);
            let writesMade = false;

            if (!settings && settingsRef) {
                console.log("Initializing settings document...");
                batch.set(settingsRef, getInitialData().settings);
                writesMade = true;
            }
            if (!logbookData && logbookRef) {
                console.log("Initializing logbookSections document...");
                batch.set(logbookRef, { sections: getInitialData().logbookSections });
                writesMade = true;
            }

            if (writesMade) {
                batch.commit().catch(e => console.error("Failed to initialize data:", e));
            }
        }
    }, [db, user, settings, logbookData, loadingSettings, loadingLogbook, settingsRef, logbookRef]);


    // --- Functions ---
    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        if (!settingsRef) return;
        // Use current settings from state as base, or initial data if state is empty
        const baseSettings = settings || getInitialData().settings;
        await setDoc(settingsRef, { ...baseSettings, ...newSettings }, { merge: true });
    };

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

    const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
        if (!invCol) return;
        await addDoc(invCol, item);
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        if (!db) return;
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


    if (!isFirebaseReady) {
        return null;
    }

    const anyError = errorSettings || errorLogs || errorInv || errorActivity || errorLogbook;
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

    const loading = loadingSettings || loadingLogs || loadingInv || loadingActivity || loadingLogbook;
    
    const initialData = getInitialData();
    const data: DataContextType = {
        settings: settings || initialData.settings,
        updateSettings,
        logs: logs as EngineLog[] | undefined,
        addLog,
        deleteLog,
        inventory: inventory as InventoryItem[] | undefined,
        addInventoryItem,
        updateInventoryItem,
        activityLog: activityLog as ActivityLog[] | undefined,
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
