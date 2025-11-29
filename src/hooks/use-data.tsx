
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { getInitialData, type AppSettings, type EngineLog, type InventoryItem, type ActivityLog, type LogSection } from '@/lib/data';

interface DataContextType {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  logs: EngineLog[];
  setLogs: React.Dispatch<React.SetStateAction<EngineLog[]>>;
  addLog: (log: EngineLog) => void;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  activityLog: ActivityLog[];
  setActivityLog: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  addActivityLog: (activity: ActivityLog) => void;
  logbookSections: LogSection[];
  setLogbookSections: React.Dispatch<React.SetStateAction<LogSection[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const initialData = getInitialData();
  const [settings, setSettings] = useState<AppSettings>(initialData.settings);
  const [logs, setLogs] = useState<EngineLog[]>(initialData.logs);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialData.inventory);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>(initialData.activityLog);
  const [logbookSections, setLogbookSections] = useState<LogSection[]>(initialData.logbookSections);

  const addLog = (log: EngineLog) => {
    setLogs(prev => [log, ...prev]);
  };
  
  const addActivityLog = (activity: ActivityLog) => {
    setActivityLog(prev => [activity, ...prev]);
  }

  const value = {
    settings,
    setSettings,
    logs,
    setLogs,
    addLog,
    inventory,
    setInventory,
    activityLog,
    setActivityLog,
    addActivityLog,
    logbookSections,
    setLogbookSections,
  };

  return (
    <DataContext.Provider value={value}>
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
