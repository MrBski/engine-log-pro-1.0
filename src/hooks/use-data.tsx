
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { 
    type AppSettings, 
    type EngineLog, 
    type InventoryItem,
    type ActivityLog, 
    type LogSection,
    getInitialData, 
} from '@/lib/data';

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
    
    // --- Local State Management for Offline Mode ---
    const [settings, setSettings] = useState<AppSettings>();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<EngineLog[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [logbookSections, setLogbookSections] = useState<LogSection[]>();
    const [isDataInitialized, setIsDataInitialized] = useState(false);

    // Initialize state from local data source only once
    useEffect(() => {
        if (!isDataInitialized) {
            const initialData = getInitialData();
            setSettings(initialData.settings);
            setInventory(initialData.inventory);
            setLogs(initialData.logs);
            setActivityLog(initialData.activityLog);
            setLogbookSections(initialData.logbookSections);
            setIsDataInitialized(true);
        }
    }, [isDataInitialized]);


    // --- MUTATION FUNCTIONS (Local State) ---
    
    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        setSettings(prev => prev ? { ...prev, ...newSettings } : undefined);
    };

    const addLog = async (logData: Omit<EngineLog, 'id'>) => {
        const newLogId = `log-${Date.now()}`;
        const newLog: EngineLog = {
            ...logData,
            id: newLogId,
        };
        setLogs(prev => [newLog, ...prev]);
        return newLogId; // Return the generated ID
    };
    
    const deleteLog = async (logId: string) => {
        setLogs(prev => prev.filter(l => l.id !== logId));
        setActivityLog(prev => prev.filter(a => !(a.type === 'engine' && a.logId === logId)));
    };

    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        const newItem: InventoryItem = {
            ...itemData,
            id: `inv-${Date.now()}`,
        };
        setInventory(prev => [newItem, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        setInventory(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
    };

    const addActivityLog = async (activityData: Omit<ActivityLog, 'id'>) => {
        const newActivity = {
            ...activityData,
            id: `act-${Date.now()}`,
        } as ActivityLog;
        setActivityLog(prev => [newActivity, ...prev]);
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        setLogbookSections(sections);
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
