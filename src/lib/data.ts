
import type { Timestamp } from 'firebase/firestore';

export type Reading = {
  id: string;
  key: string;
  unit: string;
  value?: string;
};

export type LogSection = {
  id: string;
  title: string;
  readings: Reading[];
};

export type EngineReading = {
  id: string;
  key: string; // e.g., "Main Engine RPM", or "M.E Port Side - RPM"
  value: string;
  unit: string;
};

export type EngineLog = {
  id: string;
  timestamp: Date | Timestamp;
  officer: string; // Name of the officer
  readings: EngineReading[];
  notes: string;
};

export type InventoryCategory = 'main-engine' | 'generator' | 'other';

export type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  stock: number;
  unit: string;
  lowStockThreshold: number;
};

export type ActivityLog = 
  | { type: 'engine', logId: string, officer: string, id: string; timestamp: Date | Timestamp }
  | { type: 'inventory'; notes: string; name: string; officer: string; category: InventoryCategory; id: string; timestamp: Date | Timestamp }
  | { type: 'generator'; notes: string; officer: string; id: string; timestamp: Date | Timestamp };


export type AppSettings = {
  shipName: string;
  officers: string[];
  runningHours: number;
  generatorRunningHours: number;
  generatorStatus: 'on' | 'off';
  generatorStartTime: number | null;
};

export type AppData = {
  settings: AppSettings;
  inventory: InventoryItem[];
  logs: EngineLog[];
  activityLog: ActivityLog[];
  logbookSections: LogSection[];
};

export const getInitialData = (): AppData => ({
  settings: {
    shipName: 'Engine log pro',
    officers: ['Chief Engineer', '2nd Engineer', 'Oiler'],
    runningHours: 0,
    generatorRunningHours: 0,
    generatorStatus: 'off' as 'on' | 'off',
    generatorStartTime: null,
  },
  inventory: [] as InventoryItem[],
  logs: [] as EngineLog[],
  activityLog: [] as ActivityLog[],
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
            { id: 'other_used', key: 'USED 4 Hours', unit: 'L' },
        ]
    }
  ] as LogSection[],
});
