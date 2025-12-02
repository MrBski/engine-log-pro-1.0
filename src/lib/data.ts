import type { Timestamp } from 'firebase/firestore';

/**
 * @description Type dasar untuk satu kolom/field input dalam Logbook Section (Configuration).
 */
export type Reading = {
  id: string; // ID unik untuk identifikasi di form
  key: string; // Label yang dilihat pengguna (e.g., 'RPM', 'L.O. PRESS')
  unit: string; // Satuan (e.g., 'rpm', 'bar', '°C')
  value?: string; // Nilai input (hanya digunakan di sisi form/hook)
};

/**
 * @description Type untuk satu bagian (Section) dalam Logbook (Configuration).
 */
export type LogSection = {
  id: string;
  title: string; // Judul bagian (e.g., 'M.E Port Side', 'Generator')
  readings: Reading[]; // Daftar field yang ada di bagian ini
};

/**
 * @description Type yang tersimpan dalam array EngineLog.readings.
 * Merupakan data hasil flattening dari LogSection.
 */
export type EngineReading = {
  id:string; // ID reading
  key: string; // Key lengkap (e.g., 'M.E Port Side - RPM')
  value: string; // Nilai yang dimasukkan
  unit: string;
};

/**
 * @description Type utama untuk satu entri Log Mesin yang tersimpan di Firestore.
 */
export type EngineLog = {
  id: string;
  timestamp: Date | Timestamp;
  officer: string; 
  readings: EngineReading[];
  notes: string; // Catatan kondisi/observasi
};

/**
 * @description Kategori yang digunakan untuk Inventory dan Activity Log.
 */
export type InventoryCategory = 'main-engine' | 'generator' | 'other';

/**
 * @description Type untuk item stok dalam Inventory.
 */
export type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  stock: number;
  unit: string;
  lowStockThreshold: number;
};

/**
 * @description Type union untuk semua jenis Activity Log.
 * Melacak aksi non-log (toggle, inventory changes).
 */
export type ActivityLog = 
  | { 
      type: 'engine', // Log Mesin (untuk view/delete)
      logId: string, // ID EngineLog yang dirujuk
      officer: string, 
      id: string; 
      timestamp: Date | Timestamp, 
      name: string, 
      category: InventoryCategory 
    }
  | { 
      type: 'inventory'; // Aksi Inventory (Add/Use/Delete)
      notes: string; // Detail aksi (e.g., "Used 5 L")
      name: string; // Nama item
      officer: string; 
      category: InventoryCategory; 
      id: string; 
      timestamp: Date | Timestamp 
    }
  | { 
      type: 'generator'; // Toggle Generator
      notes: string; 
      officer: string; 
      id: string; 
      timestamp: Date | Timestamp 
    }
  | { 
      type: 'main_engine'; // Toggle Main Engine (M.E)
      notes: string; 
      officer: string; 
      id: string; 
      timestamp: Date | Timestamp 
    }; 


/**
 * @description Type untuk Settings aplikasi yang disimpan per kapal.
 */
export type AppSettings = {
  shipName: string;
  officers: string[];
  runningHours: number; // Total Jam M.E dari Log Input (4 jam/entry)

  // Fitur Generator
  generatorRunningHours: number;
  generatorStatus: 'on' | 'off';
  generatorStartTime: number | null;
  generatorLastReset: Date | Timestamp | null;

  // Fitur Main Engine (M.E) Status
  mainEngineRunningHours: number; // Jam M.E yang sudah berjalan di timer
  mainEngineStatus: 'on' | 'off';
  mainEngineStartTime: number | null;
  mainEngineLastReset: Date | Timestamp | null;
};

/**
 * @description Type untuk struktur data lengkap yang disimpan per kapal.
 */
export type AppData = {
  settings: AppSettings;
  inventory: InventoryItem[];
  logs: EngineLog[];
  activityLog: ActivityLog[];
  logbookSections: LogSection[];
};

/**
 * @description Menyediakan data inisialisasi default (fallback) untuk kapal baru atau user Guest.
 */
export const getInitialData = (): AppData => ({
  settings: {
    shipName: 'Engine log pro',
    officers: ['Chief Engineer', '2nd Engineer', 'Oiler'],
    runningHours: 0,

    generatorRunningHours: 0,
    generatorStatus: 'off' as 'on' | 'off',
    generatorStartTime: null,
    generatorLastReset: null,

    mainEngineRunningHours: 0,
    mainEngineStatus: 'off' as 'on' | 'off',
    mainEngineStartTime: null,
    mainEngineLastReset: null,
  },
  inventory: [] as InventoryItem[],
  logs: [] as EngineLog[],
  activityLog: [] as ActivityLog[],
  // Struktur default Logbook Sections untuk input data
  logbookSections: [
    {
      id: 'section-1',
      title: 'M.E Port Side',
      readings: [
        { id: 'me_port_rpm', key: 'RPM', unit: 'rpm' },
        { id: 'me_port_lo_press', key: 'L.O. PRESS', unit: 'bar' },
        { id: 'me_port_exhaust1', key: 'Exhaust 1', unit: '°C' },
        { id: 'me_port_exhaust2', key: 'Exhaust 2', unit: '°C' },
        { id: 'me_port_radiator', key: 'Radiator', unit: '°C' },
        { id: 'me_port_sw_temp', key: 'SW Temp', unit: '°C' },
        { id: 'me_port_fw_in', key: 'F.W. COOLERS In', unit: '°C' },
        { id: 'me_port_fw_out', key: 'F.W. COOLERS Out', unit: '°C' },
        { id: 'me_port_lo_in', key: 'L.O. COOLERS In', unit: '°C' },
        { id: 'me_port_lo_out', key: 'L.O. COOLERS Out', unit: '°C' },
      ],
    },
    {
      id: 'section-2',
      title: 'M.E Starboard',
      readings: [
        { id: 'me_sb_rpm', key: 'RPM', unit: 'rpm' },
        { id: 'me_sb_lo_press', key: 'L.O. PRESS', unit: 'bar' },
        { id: 'me_sb_exhaust1', key: 'Exhaust 1', unit: '°C' },
        { id: 'me_sb_exhaust2', key: 'Exhaust 2', unit: '°C' },
        { id: 'me_sb_radiator', key: 'Radiator', unit: '°C' },
        { id: 'me_sb_sw_temp', key: 'SW Temp', unit: '°C' },
        { id: 'me_sb_fw_in', key: 'F.W. COOLERS In', unit: '°C' },
        { id: 'me_sb_fw_out', key: 'F.W. COOLERS Out', unit: '°C' },
        { id: 'me_sb_lo_in', key: 'L.O. COOLERS In', unit: '°C' },
        { id: 'me_sb_lo_out', key: 'L.O. COOLERS Out', unit: '°C' },
      ],
    },
    {
      id: 'section-3',
      title: 'Generator',
      readings: [
        { id: 'gen_lo_press', key: 'L.O. PRESS', unit: 'bar' },
        { id: 'gen_fw_temp', key: 'F.W. TEMP', unit: '°C' },
        { id: 'gen_volts', key: 'VOLTS', unit: 'V' },
        { id: 'gen_ampere', key: 'AMPERE', unit: 'A' },
      ],
    },
    {
        id: 'section-4',
        title: 'Flowmeter',
        readings: [
            { id: 'flow_before', key: 'Before', unit: 'L' },
            { id: 'flow_after', key: 'After', unit: 'L' },
        ],
    },
    {
      id: 'section-5',
      title: 'Daily Tank',
      readings: [
          { id: 'daily_before', key: 'Before', unit: 'cm' },
          { id: 'daily_after', key: 'After', unit: 'L' },
      ],
    },
    {
      id: 'section-6',
      title: 'Daily Tank Before On Duty',
      readings: [
        { id: 'onduty_before', key: 'Before', unit: 'cm' },
      ],
    },
    {
        id: 'section-7',
        title: 'Others',
        readings: [
            { id: 'other_rob', key: 'RoB', unit: 'L' },
            { id: 'other_used', key: 'USED 4 Hours', unit: 'L' }, // Field calculated secara otomatis
        ]
    }
  ] as LogSection[],
});
