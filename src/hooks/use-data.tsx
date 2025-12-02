'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    deleteDoc,
    setDoc,
    getDoc,
    getDocs,
    Timestamp,
    query,
    orderBy,
    writeBatch,
    limit,
    updateDoc,
    startAfter,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
    type AppSettings,
    type EngineLog,
    type InventoryItem,
    type ActivityLog,
    type LogSection,
    getInitialData,
} from '@/lib/data';
import { useToast } from './use-toast';

// --- HELPER FUNCTIONS (INTERNAL) ---

/**
 * @description Mengkonversi objek Firebase Timestamp menjadi objek JavaScript Date.
 */
const convertTimestamps = (data: any): any => {
    if (!data) return data;
    if (data instanceof Timestamp) return data.toDate();
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
      const date = new Date(data);
      if (!isNaN(date.getTime())) return date;
    }
    if (Array.isArray(data)) return data.map(convertTimestamps);
    if (typeof data === 'object' && data !== null) {
      const newObj: { [key: string]: any } = {};
      for (const key in data) {
        newObj[key] = convertTimestamps(data[key]);
      }
      return newObj;
    }
    return data;
};

/**
 * @description Type untuk item yang dimasukkan ke dalam antrian upload offline (Local Storage Queue).
 */
type UploadQueueItem = 
    | { type: 'set', path: string[], data: any }
    | { type: 'update', path: string[], data: any }
    | { type: 'delete', path: string[] };

/**
 * @description Definisi interface Context yang diekspos oleh useData (Core API).
 */
interface DataContextType {
  settings: AppSettings | undefined;
  updateSettings: (newSettings: Partial<Omit<AppSettings, 'id'>>) => Promise<void>;
  settingsLoading: boolean;

  logs: EngineLog[];
  addLog: (log: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<string | undefined>;
  deleteLog: (logId: string) => Promise<void>;
  logsLoading: boolean;
  fetchMoreLogs: () => Promise<void>;
  hasMoreLogs: boolean;

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  inventoryLoading: boolean;

  activityLog: ActivityLog[];
  addActivityLog: (activity: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => Promise<void>;
  activityLogLoading: boolean;
  fetchMoreActivityLogs: () => Promise<void>;
  hasMoreActivityLogs: boolean;

  logbookSections: LogSection[] | undefined;
  updateLogbookSections: (sections: LogSection[]) => Promise<void>;
  logbookLoading: boolean;

  isSyncing: boolean;
  syncWithFirebase: () => Promise<void>; 
  loading: boolean; 
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Konstanta Konfigurasi Database
const MAIN_COLLECTION_PREFIX = 'TB.'; 
const LOG_PAGE_SIZE = 50; 

/**
 * @description Mengambil data dari Local Storage dengan safety check dan fallback.
 */
const getLocalData = (key: string, defaultValue: any) => {
    if (typeof window === 'undefined') return defaultValue;
    const saved = localStorage.getItem(key);
    try {
      const parsed = saved ? JSON.parse(saved) : defaultValue;
      return parsed ?? defaultValue; 
    } catch (e) {
        console.error("Failed to parse local data for key:", key, e);
        return defaultValue;
    }
};

/**
 * @description Menyimpan data ke Local Storage.
 */
const setLocalData = (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error("LocalStorage full or error", e);
    }
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();

    // --- STATE MANAGEMENT ---
    const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<EngineLog[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [logbookSections, setLogbookSections] = useState<LogSection[] | undefined>(undefined);

    // --- LOADING STATE ---
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(true);
    const [activityLogLoading, setActivityLogLoading] = useState(true);
    const [logbookLoading, setLogbookLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // --- PAGINATION STATE ---
    const [lastLogDoc, setLastLogDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMoreLogs, setHasMoreLogs] = useState(true);
    const [lastActivityLogDoc, setLastActivityLogDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMoreActivityLogs, setHasMoreActivityLogs] = useState(true);

    // --- DERIVED STATE ---
    const shipId = user?.shipId;
    const mainCollectionId = shipId ? `${MAIN_COLLECTION_PREFIX}${shipId.toUpperCase()}` : undefined;

    /**
     * @description Memuat semua state data awal dari Local Storage saat startup (Offline-First).
     */
    const loadLocalData = useCallback(() => {
        const currentShipId = user?.shipId || 'guest-user';
        const initialData = getInitialData();

        const savedSettings = getLocalData(`settings_${currentShipId}`, initialData.settings);
        const mergedSettings = { ...initialData.settings, ...savedSettings };

        setSettings(convertTimestamps(mergedSettings));
        setInventory(getLocalData(`inventory_${currentShipId}`, initialData.inventory) || []);
        setLogs(convertTimestamps(getLocalData(`logs_${currentShipId}`, initialData.logs) || []));
        setActivityLog(convertTimestamps(getLocalData(`activityLog_${currentShipId}`, initialData.activityLog) || []));
        setLogbookSections(getLocalData(`logbookSections_${currentShipId}`, initialData.logbookSections));

        setSettingsLoading(false);
        setInventoryLoading(false);
        setLogsLoading(false);
        setActivityLogLoading(false);
        setLogbookLoading(false);
    }, [user?.shipId]);

    /**
     * @description Memproses antrian upload (perubahan offline) ke Firestore menggunakan writeBatch.
     * Mengandung logika khusus untuk memfilter aksi TOGGLE yang redundant (START/ON ke status yang sudah ON).
     */
    const processUploadQueue = async (shipId: string, mainCollectionId: string) => {
        if (!db) return;
        const queueKey = `uploadQueue_${shipId}`;
        let queue = getLocalData(queueKey, []);
        if (!Array.isArray(queue) || queue.length === 0) return;

        toast({ title: "Syncing Offline Changes...", description: `Uploading ${queue.length} items.` });

        try {
            // 1. Ambil STATUS SETTINGS TERBARU dari server
            const shipDocRef = doc(db, mainCollectionId, shipId);
            const settingsSnap = await getDoc(shipDocRef);
            const currentServerSettings = settingsSnap.exists() ? settingsSnap.data() : {};
            
            const batch = writeBatch(db);
            const itemsToCommit: UploadQueueItem[] = [];
            
            // Looping melalui item Queue untuk memfilter aksi toggle yang redundant
            for (const item of queue) {
                const { type, path, data } = item;
                
                // --- LOGIC KONFLIK KHUSUS UNTUK TOGGLE ACTIONS (SETTINGS UPDATE) ---
                if (type === 'update' && path.length === 1 && path[0] === shipId) {
                    
                    const actionType = data.mainEngineStatus ? 'main_engine' : (data.generatorStatus ? 'generator' : null);

                    if (actionType) {
                         const serverStatus = actionType === 'main_engine' 
                            ? currentServerSettings.mainEngineStatus 
                            : currentServerSettings.generatorStatus;
                            
                         const localStatus = actionType === 'main_engine' 
                            ? data.mainEngineStatus 
                            : data.generatorStatus;
                        
                         // Filter Redundant START/ON: Menjaga waktu start yang lebih dulu di server
                         if (localStatus === 'on' && serverStatus === 'on') {
                             console.warn(`[Sync Skip] Redundant START/ON for ${actionType}. Server already ON.`);
                             continue; 
                         }
                         // Filter Redundant STOP/OFF
                         if (localStatus === 'off' && serverStatus === 'off') {
                             console.warn(`[Sync Skip] Redundant STOP/OFF for ${actionType}. Server already OFF.`);
                             continue; 
                         }
                    }
                }
                // --- AKHIR LOGIC KONFLIK KHUSUS ---

                // Jika tidak diabaikan, tambahkan ke batch
                const docRef = doc(db, mainCollectionId, ...path);
                if (type === 'set') {
                    batch.set(docRef, data);
                } else if (type === 'update') {
                    batch.update(docRef, data);
                } else if (type === 'delete') {
                    batch.delete(docRef);
                }
                
                itemsToCommit.push(item);
            }
            
            // Commit Batch ke Firestore
            await batch.commit();
            
            // Bersihkan seluruh antrian setelah commit
            setLocalData(queueKey, []); 
            
            toast({ title: "Offline Changes Synced", description: `Uploaded ${itemsToCommit.length} changes.` });

        } catch (error: any) {
            console.error("Firebase sync failed during queue processing:", error);
            toast({ title: "Sync Error", description: error.message || "Could not sync offline changes.", variant: "destructive" });
        }
    };


    /**
     * @description Mengambil data state terbaru dari Firebase (Initial Fetch & Sync).
     */
    const fetchInitialData = useCallback(async (isSilent = false) => {
        if (!user || user.uid === 'guest-user' || !db || !navigator.onLine || !mainCollectionId || !shipId) {
            if (!isSilent && navigator.onLine && user?.uid !== 'guest-user') {
                toast({ title: "Sync Failed", description: "You are not logged in.", variant: "destructive" });
            }
            return;
        }

        if (isSyncing) return;
        setIsSyncing(true);
        if (!isSilent) toast({ title: "Syncing...", description: "Processing offline changes and fetching server data." });

        try {
            await processUploadQueue(shipId, mainCollectionId); // 1. Proses antrian offline

            const shipDocRef = doc(db, mainCollectionId, shipId);
            let settingsSnap = await getDoc(shipDocRef);

            // Inisialisasi Database jika belum ada
            if (!settingsSnap.exists()) {
                if (!isSilent) toast({ title: "New Setup", description: `Initializing database for ${shipId}.` });
                const initialData = getInitialData();
                const batch = writeBatch(db);
                const initialSettings = { ...initialData.settings, shipName: shipId };
                batch.set(shipDocRef, initialSettings);
                batch.set(doc(shipDocRef, 'config', 'logbook'), { sections: initialData.logbookSections });
                await batch.commit();
                settingsSnap = await getDoc(shipDocRef); 
            }

            const logbookSnap = await getDoc(doc(shipDocRef, 'config', 'logbook'));

            // Fetch data utama secara paralel
            const [inventorySnap, logsSnap, activityLogSnap] = await Promise.all([
                getDocs(query(collection(shipDocRef, 'inventory'))),
                getDocs(query(collection(shipDocRef, 'logs'), orderBy('timestamp', 'desc'), limit(LOG_PAGE_SIZE))),
                getDocs(query(collection(shipDocRef, 'activityLog'), orderBy('timestamp', 'desc'), limit(LOG_PAGE_SIZE))),
            ]);

            // --- UPDATE STATES ---
            const remoteSettingsData = settingsSnap.exists() ? settingsSnap.data() : getInitialData().settings;
            const finalRemoteSettings = { ...getInitialData().settings, ...remoteSettingsData };
            const convertedSettings = convertTimestamps(finalRemoteSettings);
            setSettings(convertedSettings);
            setLocalData(`settings_${shipId}`, convertedSettings);

            const remoteLogbook = logbookSnap.exists() ? logbookSnap.data().sections : getInitialData().logbookSections;
            setLogbookSections(remoteLogbook);
            setLocalData(`logbookSections_${shipId}`, remoteLogbook);

            const remoteInventory = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryItem[];
            setInventory(remoteInventory);
            setLocalData(`inventory_${shipId}`, remoteInventory);

            const remoteLogs = logsSnap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as EngineLog[];
            setLogs(remoteLogs); 
            setLocalData(`logs_${shipId}`, remoteLogs);
            setLastLogDoc(logsSnap.docs[logsSnap.docs.length - 1]);
            setHasMoreLogs(logsSnap.docs.length === LOG_PAGE_SIZE);

            const remoteActivityLog = activityLogSnap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as ActivityLog[];
            setActivityLog(remoteActivityLog); 
            setLocalData(`activityLog_${shipId}`, remoteActivityLog);
            setLastActivityLogDoc(activityLogSnap.docs[activityLogSnap.docs.length - 1]);
            setHasMoreActivityLogs(activityLogSnap.docs.length === LOG_PAGE_SIZE);

            if (!isSilent) toast({ title: "Sync Complete", description: "Your data is up to date." });

        } catch (error: any) {
            console.error("Firebase sync failed:", error);
            if (!isSilent) toast({ title: "Sync Error", description: error.message || "Could not sync with Firebase.", variant: "destructive" });
        } finally {
            setIsSyncing(false);
            setSettingsLoading(false);
            setInventoryLoading(false);
            setLogsLoading(false);
            setActivityLogLoading(false);
            setLogbookLoading(false);
        }
    }, [user, shipId, mainCollectionId, toast, isSyncing]);

    const syncWithFirebase = fetchInitialData;

    /**
     * @description Fetch 50 Activity Logs selanjutnya untuk pagination (Load More).
     */
    const fetchMoreActivityLogs = async () => {
        if (!mainCollectionId || !shipId || !db || !lastActivityLogDoc || !hasMoreActivityLogs) return;
        setActivityLogLoading(true);

        try {
            const q = query(
                collection(db, mainCollectionId, shipId, 'activityLog'), 
                orderBy('timestamp', 'desc'), 
                startAfter(lastActivityLogDoc), 
                limit(LOG_PAGE_SIZE)
            );
            const activityLogSnap = await getDocs(q);
            const newActivityLogs = activityLogSnap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as ActivityLog[];

            setActivityLog(prev => {
                const updated = [...prev, ...newActivityLogs];
                setLocalData(`activityLog_${shipId}`, updated); 
                return updated;
            });

            setLastActivityLogDoc(activityLogSnap.docs[activityLogSnap.docs.length - 1]);
            setHasMoreActivityLogs(activityLogSnap.docs.length === LOG_PAGE_SIZE);
        } catch (error: any) {
            console.error("Failed to fetch more activity logs:", error);
            toast({ title: "Error", description: "Could not load more activities.", variant: "destructive" });
        } finally {
             setActivityLogLoading(false);
        }
    };

    /**
     * @description Fetch 50 Engine Logs selanjutnya untuk pagination (Load More).
     */
    const fetchMoreLogs = async () => {
        if (!mainCollectionId || !shipId || !db || !lastLogDoc || !hasMoreLogs) return;
        setLogsLoading(true);

        try {
            const q = query(
                collection(db, mainCollectionId, shipId, 'logs'), 
                orderBy('timestamp', 'desc'), 
                startAfter(lastLogDoc), 
                limit(LOG_PAGE_SIZE)
            );
            const logsSnap = await getDocs(q);
            const newLogs = logsSnap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as EngineLog[];

            setLogs(prev => {
                const updated = [...prev, ...newLogs];
                setLocalData(`logs_${shipId}`, updated); 
                return updated;
            });
            setLastLogDoc(logsSnap.docs[logsSnap.docs.length - 1]);
            setHasMoreLogs(logsSnap.docs.length === LOG_PAGE_SIZE);
        } catch (error: any) {
            console.error("Failed to fetch more logs:", error);
            toast({ title: "Error", description: "Could not load more logs.", variant: "destructive" });
        } finally {
            setLogsLoading(false);
        }
    };


    // --- EFFECT: Load Local Data saat komponen mount ---
    useEffect(() => {
        loadLocalData();
    }, [loadLocalData]);

    // --- EFFECT: Auto Sync saat user login atau setiap 15 menit ---
    useEffect(() => {
        if (user && user.uid !== 'guest-user' && !isSyncing) {
            fetchInitialData(true);
            const interval = setInterval(() => fetchInitialData(true), 15 * 60 * 1000); 
            return () => clearInterval(interval);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]);

    /**
     * @description Handler generik untuk operasi tulis (Create/Update/Delete).
     */
    const performWrite = async (
        updateLocalState: () => void,
        firebaseWriteFn?: () => Promise<any>,
        uploadQueueItem?: UploadQueueItem
    ) => {
        updateLocalState(); // 1. Update state lokal segera (Offline-First UX)

        if (user?.uid === 'guest-user' || !shipId) return;

        if (navigator.onLine && firebaseWriteFn) {
            try {
                await firebaseWriteFn(); // 2. Jika online, coba tulis ke Firebase
            } catch (error: any) {
                // 3. Jika Firebase GAGAL, masukkan ke antrian upload
                toast({ title: "Write Failed", description: "Could not save to server. Change queued for next sync.", variant: 'destructive'});
                if (uploadQueueItem) {
                    const queueKey = `uploadQueue_${shipId}`;
                    const queue = getLocalData(queueKey, []);
                    setLocalData(queueKey, [...(Array.isArray(queue) ? queue : []), uploadQueueItem]);
                }
            }
        } else if (uploadQueueItem) {
            // 4. Jika offline total, masukkan ke antrian
            const queueKey = `uploadQueue_${shipId}`;
            const queue = getLocalData(queueKey, []);
            setLocalData(queueKey, [...(Array.isArray(queue) ? queue : []), uploadQueueItem]);
            toast({ title: "Offline", description: "Change saved locally and will sync when online." });
        }
    };

    // --- MUTATORS (Fungsi Tulis Data) ---

    /**
     * @description Memperbarui App Settings (termasuk status M.E/Generator).
     */
    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        if (!shipId || !mainCollectionId) return;
        const updateFn = () => {
            setSettings(prev => {
                const updated = { ...getInitialData().settings, ...(prev || {}), ...newSettings };
                setLocalData(`settings_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => setDoc(doc(db, mainCollectionId, shipId), newSettings, { merge: true });
        const queueItem: UploadQueueItem = { type: 'update', path: [shipId], data: newSettings };
        await performWrite(updateFn, firebaseFn, queueItem);
    };

    /**
     * @description Menambahkan Engine Log baru.
     */
    const addLog = async (logData: Omit<EngineLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        if (!shipId || !mainCollectionId) return;
        const newLogId = `log_${Date.now()}`;
        const newLog = { ...logData, id: newLogId, timestamp: logData.timestamp.toISOString() };

        const updateFn = () => {
            setLogs(prev => {
                const updated = [convertTimestamps(newLog), ...prev];
                setLocalData(`logs_${shipId}`, updated);
                return updated;
            });
        };

        const firebaseData = { ...logData, timestamp: Timestamp.fromDate(logData.timestamp) };
        const firebaseFn = () => setDoc(doc(db, mainCollectionId, shipId, 'logs', newLogId), firebaseData);
        const queueItem: UploadQueueItem = { type: 'set', path: [shipId, 'logs', newLogId], data: firebaseData };
        await performWrite(updateFn, firebaseFn, queueItem);
        return newLogId;
    };

    /**
     * @description Private helper untuk menghapus Activity Log berdasarkan logId EngineLog yang dirujuk.
     */
    const deleteActivityLogByLogId = async (logId: string) => {
        if (!shipId || !mainCollectionId) return;
        const activity = activityLog.find(a => 'logId' in a && a.logId === logId); 
        if (!activity) return; 

        const activityId = activity.id;
        const updateFn = () => {
            setActivityLog(prev => {
                const updated = prev.filter(l => l.id !== activityId);
                setLocalData(`activityLog_${shipId}`, updated);
                return updated;
            });
        };

        const firebaseFn = () => deleteDoc(doc(db, mainCollectionId, shipId, 'activityLog', activityId));
        const queueItem: UploadQueueItem = { type: 'delete', path: [shipId, 'activityLog', activityId] };
        await performWrite(updateFn, firebaseFn, queueItem);
    };

    /**
     * @description Menghapus Engine Log utama dan Activity Log yang terkait (Cascading Delete).
     */
    const deleteLog = async (logId: string) => {
        if (!shipId || !mainCollectionId) return;

        await deleteActivityLogByLogId(logId); // 1. Casacading Delete
        
        // 2. Hapus Log Mesin
        const updateFn = () => {
            setLogs(prev => {
                const updated = prev.filter(l => l.id !== logId);
                setLocalData(`logs_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => deleteDoc(doc(db, mainCollectionId, shipId, 'logs', logId));
        const queueItem: UploadQueueItem = { type: 'delete', path: [shipId, 'logs', logId] };
        await performWrite(updateFn, firebaseFn, queueItem);
    };

    /**
     * @description Menambahkan item Inventory baru.
     */
    const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
        if (!shipId || !mainCollectionId) return;
        const newItemId = `inv_${Date.now()}`;
        const newItem = { ...itemData, id: newItemId };

        const updateFn = () => {
            setInventory(prev => {
                const updated = [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name));
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseData = { ...itemData };
        const firebaseFn = () => setDoc(doc(db, mainCollectionId, shipId, 'inventory', newItemId), firebaseData);
        const queueItem: UploadQueueItem = { type: 'set', path: [shipId, 'inventory', newItemId], data: firebaseData };
        await performWrite(updateFn, firebaseFn, queueItem);
    };

    /**
     * @description Memperbarui detail atau stok item Inventory.
     */
    const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
        if (!shipId || !mainCollectionId) return;
        const updateFn = () => {
            setInventory(prev => {
                const updated = prev.map(item => item.id === itemId ? { ...item, ...updates } : item);
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseData = { ...updates };
        const firebaseFn = () => updateDoc(doc(db, mainCollectionId, shipId, 'inventory', itemId), firebaseData);
        const queueItem: UploadQueueItem = { type: 'update', path: [shipId, 'inventory', itemId], data: firebaseData };
        await performWrite(updateFn, firebaseFn, queueItem);
    };

    /**
     * @description Menghapus item Inventory.
     */
    const deleteInventoryItem = async (itemId: string) => {
        if (!shipId || !mainCollectionId) return;
        const updateFn = () => {
            setInventory(prev => {
                const updated = prev.filter(item => item.id !== itemId);
                setLocalData(`inventory_${shipId}`, updated);
                return updated;
            });
        };
        const firebaseFn = () => deleteDoc(doc(db, mainCollectionId, shipId, 'inventory', itemId));
        const queueItem: UploadQueueItem = { type: 'delete', path: [shipId, 'inventory', itemId] };
        await performWrite(updateFn, firebaseFn, queueItem);
    };

    /**
     * @description Menambahkan Activity Log.
     */
    const addActivityLog = async (activityData: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Date }) => {
        if (!shipId || !mainCollectionId) return;
        const newActivityId = `act_${Date.now()}`;
        const newActivity = { ...activityData, id: newActivityId, timestamp: activityData.timestamp.toISOString() };

        const updateFn = () => {
            setActivityLog(prev => {
                const updated = [convertTimestamps(newActivity), ...prev];
                setLocalData(`activityLog_${shipId}`, updated);
                return updated;
            });
        };

        const firebaseData = { ...activityData, timestamp: Timestamp.fromDate(activityData.timestamp) };
        const firebaseFn = () => setDoc(doc(db, mainCollectionId, shipId, 'activityLog', newActivityId), firebaseData);
        const queueItem: UploadQueueItem = { type: 'set', path: [shipId, 'activityLog', newActivityId], data: firebaseData };
        await performWrite(updateFn, firebaseFn, queueItem);
    };

    /**
     * @description Memperbarui struktur Logbook Sections (Konfigurasi).
     */
    const updateLogbookSections = async (sections: LogSection[]) => {
        if (!shipId || !mainCollectionId) return;
        const updateFn = () => {
            setLogbookSections(sections);
            setLocalData(`logbookSections_${shipId}`, sections);
        };
        const firebaseData = { sections };
        const firebaseFn = () => setDoc(doc(db, mainCollectionId, shipId, 'config', 'logbook'), firebaseData);
        const queueItem: UploadQueueItem = { type: 'set', path: [shipId, 'config', 'logbook'], data: firebaseData };
        await performWrite(updateFn, firebaseFn, queueItem);
    };


    const loading = authLoading || settingsLoading || inventoryLoading || logsLoading || activityLogLoading || logbookLoading;

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
        deleteInventoryItem,
        addActivityLog,
        updateLogbookSections,
        settingsLoading,
        inventoryLoading,
        logsLoading,
        activityLogLoading,
        logbookLoading,
        isSyncing,
        syncWithFirebase,
        loading,
        fetchMoreLogs,
        hasMoreLogs,
        fetchMoreActivityLogs,
        hasMoreActivityLogs,
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
