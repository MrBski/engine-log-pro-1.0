
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
    getInitialData, 
    type AppData,
    type AppSettings, 
    type EngineLog, 
    type InventoryItem,
    type ActivityLog, 
    type LogSection 
} from '@/lib/data';

interface DataContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  
  logs: EngineLog[];
  addLog: (log: Omit<EngineLog, 'id'>) => Promise<string>;
  deleteLog: (logId: string) => Promise<void>;

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  
  activityLog: ActivityLog[];
  addActivityLog: (activity: Omit<ActivityLog, 'id'>) => Promise<void>;

  logbookSections: LogSection[];
  updateLogbookSections: (sections: LogSection[]) => Promise<void>;

  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<AppData>(getInitialData());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real offline-first app with local storage persistence,
        // you would load the data from localStorage here.
        // For this debugging version, we just use the initial data.
        setData(getInitialData());
        setLoading(false);
    }, []);

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        setData(prevData => ({
            ...prevData,
            settings: { ...prevData.settings, ...newSettings },
        }));
    };

    const addLog = async (log: Omit<EngineLog, 'id'>) => {
        const newLog = {
            ...log,
            id: `log-${Date.now()}`,
        };
        setData(prevData => ({
            ...prevData,
            logs: [newLog, ...prevData.logs],
        }));
        return newLog.id;
    };
    
    const deleteLog = async (logId: string) => {
        setData(prevData => ({
            ...prevData,
            logs: prevData.logs.filter(log => log.id !== logId),
            // Also remove associated activity log
            activityLog: prevData.activityLog.filter(act => !('logId' in act) || act.logId !== logId),
        }));
    };

    const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
        const newItem = {
            ...item,
            id: `inv-${Date.now()}`,
        }
        setData(prevData => ({
            ...prevData,
            inventory: [...prevData.inventory, newItem].sort((a, b) => a.name.localeCompare(b.name)),
        }));
    };

    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        setData(prevData => ({
            ...prevData,
            inventory: prevData.inventory.map(item => 
                item.id === itemId ? { ...item, ...updates } : item
            ),
        }));
    };

    const addActivityLog = async (activity: Omit<ActivityLog, 'id'>) => {
        const newActivity = {
            ...activity,
            id: `act-${Date.now()}`,
        };
        setData(prevData => ({
            ...prevData,
            activityLog: [newActivity, ...prevData.activityLog],
        }));
    };
    
    const updateLogbookSections = async (sections: LogSection[]) => {
        setData(prevData => ({
            ...prevData,
            logbookSections: sections,
        }));
    };
    
    const contextValue: DataContextType = {
        settings: data.settings,
        logs: data.logs,
        inventory: data.inventory,
        activityLog: data.activityLog,
        logbookSections: data.logbookSections,
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
        <DataContext.Provider value={contextValue}>
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