export type EngineReading = {
  id: string;
  key: string;
  value: string;
  unit: string;
};

export type EngineLog = {
  id: string;
  timestamp: string;
  officer: string;
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

export type AppSettings = {
  shipName: string;
  officers: string[];
};

export const getInitialData = () => ({
  settings: {
    shipName: 'MV Stellar',
    officers: ['Chief Engineer', '2nd Engineer', 'Oiler'],
  },
  inventory: [
    { id: 'item-1', name: 'Lube Oil Filter', category: 'main-engine', stock: 10, unit: 'pcs', lowStockThreshold: 2 },
    { id: 'item-2', name: 'Fuel Injector Nozzle', category: 'main-engine', stock: 5, unit: 'pcs', lowStockThreshold: 1 },
    { id: 'item-3', name: 'Coolant', category: 'generator', stock: 50, unit: 'liters', lowStockThreshold: 10 },
    { id: 'item-4', name: 'Generator Air Filter', category: 'generator', stock: 1, unit: 'pcs', lowStockThreshold: 2 },
    { id: 'item-5', name: 'Hydraulic Fluid', category: 'other', stock: 25, unit: 'liters', lowStockThreshold: 5 },
    { id: 'item-6', name: 'Cleaning Rags', category: 'other', stock: 100, unit: 'pcs', lowStockThreshold: 20 },
  ],
  logs: [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      officer: 'Chief Engineer',
      readings: [
        { id: 'r1', key: 'Main Engine RPM', value: '85', unit: 'rpm' },
        { id: 'r2', key: 'Fuel Consumption', value: '150', unit: 'L/hr' },
        { id: 'r3', key: 'Oil Pressure', value: '4.5', unit: 'bar' },
      ],
      notes: 'All systems normal. Minor vibration noted on shaft.',
    },
  ],
});
