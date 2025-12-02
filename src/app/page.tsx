"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icons } from "@/components/icons";
import { type EngineLog } from "@/lib/data";
import { Bar, BarChart, XAxis, YAxis, Legend, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useData } from "@/hooks/use-data";
import { formatDistanceToNow } from 'date-fns';

// --- HELPER FUNCTIONS (REKOMENDASI: Pindahkan ke src/lib/utils.ts) ---

/**
 * @description Memformat total detik menjadi format HH:MM:SS (Running Hours Timer).
 * @param seconds Total waktu dalam detik.
 */
function formatDuration(seconds: number) {
    if (isNaN(seconds)) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * @description Mengkonversi timestamp (Date/Firebase Timestamp/string) ke objek Date yang aman.
 * @param timestamp Nilai timestamp yang masuk.
 */
const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
        return date;
    }
    return null;
};

// --- KOMPONEN UTAMA DASHBOARD ---

export default function DashboardPage() {
  const { 
    inventory, logs, settings, 
    updateSettings, addActivityLog, 
    loading, settingsLoading 
  } = useData();

  const [mounted, setMounted] = useState(false);
  const [genElapsed, setGenElapsed] = useState(0); 
  const [meElapsed, setMeElapsed] = useState(0); // State waktu berjalan Main Engine (M.E)

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- TIMER GENERATOR ---
  /**
   * @description Menghitung waktu berjalan Generator. 
   * Memperbarui state genElapsed setiap detik berdasarkan settings.
   */
  useEffect(() => {
    if (!settings) return;
    
    // Perhitungan awal (total jam tersimpan)
    const storedSeconds = (settings.generatorRunningHours || 0) * 3600;

    // Inisialisasi/Update pertama
    if (settings.generatorStatus === 'on' && settings.generatorStartTime) {
        setGenElapsed(storedSeconds + (Date.now() - settings.generatorStartTime) / 1000);
    } else {
        setGenElapsed(storedSeconds);
    }

    // Interval Timer
    const interval = setInterval(() => {
        if (settings.generatorStatus === 'on' && settings.generatorStartTime) {
            const elapsed = (Date.now() - settings.generatorStartTime) / 1000;
            setGenElapsed(storedSeconds + elapsed);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  // --- TIMER MAIN ENGINE (M.E) ---
  /**
   * @description Menghitung waktu berjalan Main Engine (M.E).
   * Memperbarui state meElapsed setiap detik berdasarkan settings.
   */
  useEffect(() => {
    if (!settings) return;

    // Perhitungan awal M.E (total jam tersimpan)
    const storedSeconds = (settings.mainEngineRunningHours || 0) * 3600;

    // Inisialisasi/Update pertama
    if (settings.mainEngineStatus === 'on' && settings.mainEngineStartTime) {
        setMeElapsed(storedSeconds + (Date.now() - settings.mainEngineStartTime) / 1000);
    } else {
        setMeElapsed(storedSeconds);
    }

    // Interval Timer
    const interval = setInterval(() => {
        if (settings.mainEngineStatus === 'on' && settings.mainEngineStartTime) {
            const elapsed = (Date.now() - settings.mainEngineStartTime) / 1000;
            setMeElapsed(storedSeconds + elapsed);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);


  // --- LOGIC TOGGLE GENERATOR ---
  /**
   * @description Mengubah status Generator ON/OFF.
   * Melakukan: 1. Menghitung elapsed hours. 2. Memperbarui AppSettings. 3. Mencatat Activity Log.
   */
  const handleGeneratorToggle = async () => {
    if (!settings || !user || !user.name) return;
    if (settings.generatorStatus === 'on') {
      // DARI ON MENJADI OFF
      const endTime = Date.now();
      const startTime = settings.generatorStartTime || endTime;
      const elapsedHours = (endTime - startTime) / (1000 * 60 * 60);
      try {
        await updateSettings({
            generatorStatus: 'off',
            generatorStartTime: null,
            generatorRunningHours: (settings.generatorRunningHours || 0) + elapsedHours,
        });
        await addActivityLog({ type: 'generator', timestamp: new Date(), notes: 'Generator turned OFF', officer: user.name });
      } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed update." }); }
    } else {
      // DARI OFF MENJADI ON
      try {
        await updateSettings({ generatorStatus: 'on', generatorStartTime: Date.now() });
        await addActivityLog({ type: 'generator', timestamp: new Date(), notes: 'Generator turned ON', officer: user.name });
      } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed update." }); }
    }
  };

  /**
   * @description Mereset jam Generator (RHS).
   */
  const handleGeneratorReset = async () => {
     if (!settings || !user || !user.name) return;
     try {
        await updateSettings({
            generatorRunningHours: 0,
            generatorStartTime: settings.generatorStatus === 'on' ? Date.now() : null,
            generatorLastReset: new Date(),
        });
        await addActivityLog({ type: 'generator', timestamp: new Date(), notes: 'Generator RHS Reset', officer: user.name });
        toast({ title: "Reset", description: "Generator hours reset." });
     } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed reset." }); }
  };

  // --- LOGIC TOGGLE MAIN ENGINE (M.E) ---
  /**
   * @description Mengubah status Main Engine ON/OFF.
   * Melakukan: 1. Menghitung elapsed hours. 2. Memperbarui AppSettings. 3. Mencatat Activity Log.
   */
  const handleMainEngineToggle = async () => {
    if (!settings || !user || !user.name) return;
    if (settings.mainEngineStatus === 'on') {
      // DARI ON MENJADI OFF
      const endTime = Date.now();
      const startTime = settings.mainEngineStartTime || endTime;
      const elapsedHours = (endTime - startTime) / (1000 * 60 * 60);
      try {
        await updateSettings({
            mainEngineStatus: 'off',
            mainEngineStartTime: null,
            mainEngineRunningHours: (settings.mainEngineRunningHours || 0) + elapsedHours,
        });
        await addActivityLog({ type: 'main_engine', timestamp: new Date(), notes: 'Main Engine turned OFF', officer: user.name });
      } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed to turn M.E OFF." }); }
    } else {
      // DARI OFF MENJADI ON
      try {
        await updateSettings({ 
            mainEngineStatus: 'on', 
            mainEngineStartTime: Date.now() 
        });
        await addActivityLog({ type: 'main_engine', timestamp: new Date(), notes: 'Main Engine turned ON', officer: user.name });
      } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed to turn M.E ON." }); }
    }
  };

  /**
   * @description Mereset jam Main Engine (RHS).
   */
  const handleMainEngineReset = async () => {
     if (!settings || !user || !user.name) return;
     try {
        await updateSettings({
            mainEngineRunningHours: 0,
            mainEngineStartTime: settings.mainEngineStatus === 'on' ? Date.now() : null,
            mainEngineLastReset: new Date(),
        });
        await addActivityLog({ type: 'main_engine', timestamp: new Date(), notes: 'Main Engine RHS Reset', officer: user.name });
        toast({ title: "Reset", description: "Main Engine hours reset." });
     } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed reset." }); }
  };

  // --- LOGIC DATA VIEW ---
  
  const lowStockItems = (inventory || []).filter(item => item.stock <= item.lowStockThreshold);
  const recentLogs = (logs || []).slice(0, 5); // Ambil 5 log terbaru dari logs array
  const latestLog = (logs && logs.length > 0) ? logs[0] : null; 
  
  /**
   * @description Mencari nilai reading tertentu dari log berdasarkan kunci (key).
   */
  const getReading = (log: EngineLog, key: string) => {
    if (!log.readings) return 'N/A';
    // Cari reading yang key-nya mengandung string pencarian (case-insensitive)
    const reading = log.readings.find(r => r.key.toLowerCase().includes(key.toLowerCase()));
    // Jika Fuel Cons, pastikan mencari 'USED 4 Hours'
    if (key.toLowerCase().includes('fuel')) {
        const fuelReading = log.readings.find(r => r.key.toLowerCase().includes('used 4 hours'));
        return fuelReading ? `${fuelReading.value} ${fuelReading.unit}` : 'N/A';
    }
    return reading ? `${reading.value} ${reading.unit}` : 'N/A';
  }

  // Data untuk Chart (mengambil 7 log terbaru, dibalikkan untuk urutan kronologis chart)
  const chartData = (logs || []).slice(0, 7).reverse().map(log => {
    const logDate = safeToDate(log.timestamp);
    return {
        date: logDate ? logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        rpm: parseFloat(log.readings.find(r => r.key.includes('RPM'))?.value || '0'),
        // Pastikan chart data Fuel mengambil 'USED 4 Hours'
        fuel: parseFloat(log.readings.find(r => r.key.toLowerCase().includes('used 4 hours'))?.value || '0'),
    }
  });

  const chartConfig = {
    rpm: { label: "RPM", color: "hsl(var(--chart-1))" },
    fuel: { label: "Fuel (L/hr)", color: "hsl(var(--chart-2))" }
  };

  const lastResetDateGen = settings?.generatorLastReset ? safeToDate(settings.generatorLastReset) : null;
  const lastResetDateME = settings?.mainEngineLastReset ? safeToDate(settings.mainEngineLastReset) : null;

  // --- LOGIKA INDIKATOR WARNA (Ambient Border & Tombol) ---
  const meToggleClassName = settings?.mainEngineStatus === 'on' 
    ? "bg-green-600 hover:bg-green-700" // Tombol ON: Hijau
    : "bg-amber-600 hover:bg-amber-700"; // Tombol OFF: Kuning/Amber
    
  const meBorderClassName = settings?.mainEngineStatus === 'on'
    ? "border-green-600" // Border ON: Hijau
    : "border-amber-600"; // Border OFF: Kuning/Amber

  const genToggleClassName = settings?.generatorStatus === 'on' 
    ? "bg-sky-500 hover:bg-sky-600" // Tombol ON: Biru
    : "bg-red-600 hover:bg-red-700"; // Tombol OFF: Merah
    
  const genBorderClassName = settings?.generatorStatus === 'on'
    ? "border-sky-500" // Border ON: Biru
    : "border-red-600"; // Border OFF: Merah

  if (!mounted || loading || settingsLoading) {
    return (
      <>
        <AppHeader />
        <div className="flex h-[50vh] items-center justify-center">
            <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </>
    );
  }

  // Fallback sederhana jika settings kosong
  if (!settings) {
      return (
        <div className="flex flex-col gap-6 p-4">
             <AppHeader />
             <div>Loading or No Data...</div>
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-6">
      <AppHeader />
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">

        {/* --- MAIN ENGINE CARD --- */}
        <Card className={cn("flex flex-col p-4 justify-between border-l-4", meBorderClassName)}>
          <div className="flex-1">
            <div className="flex items-start">
              <Icons.clock className="h-6 w-6 text-muted-foreground mr-4" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">M.E Running Hours</p>
                 <p className="text-xl font-bold">{formatDuration(meElapsed)}</p>
                 {lastResetDateME && (
                     <p className="text-xs text-muted-foreground mt-1">
                         Reset {formatDistanceToNow(lastResetDateME, { addSuffix: true })}
                     </p>
                 )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
               {/* Reset Dialog */}
               <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-8 w-8" disabled={!user}><Icons.reset /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Reset Main Engine RHS?</AlertDialogTitle><AlertDialogDescription>This will reset to 0.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleMainEngineReset}>Reset</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
              {/* Toggle Button */}
              <Button 
                  size="icon" 
                  className={cn("h-8 w-8", meToggleClassName)} 
                  onClick={handleMainEngineToggle}
                  disabled={!user}
              >
                  {settings?.mainEngineStatus === 'on' ? <Icons.powerOff /> : <Icons.power />}
              </Button>
          </div>
        </Card>

        {/* --- GENERATOR CARD --- */}
        <Card className={cn("flex flex-col p-4 justify-between border-l-4", genBorderClassName)}>
            <div className="flex-1">
              <div className="flex items-start">
                <Icons.clock className="h-6 w-6 text-muted-foreground mr-4" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Generator RHS</p>
                   <p className="text-xl font-bold">{formatDuration(genElapsed)}</p>
                   {lastResetDateGen && (
                       <p className="text-xs text-muted-foreground mt-1">
                           Reset {formatDistanceToNow(lastResetDateGen, { addSuffix: true })}
                       </p>
                   )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
                 {/* Reset Dialog */}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8" disabled={!user}><Icons.reset /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Reset Generator RHS?</AlertDialogTitle><AlertDialogDescription>This will reset to 0.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleGeneratorReset}>Reset</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                {/* Toggle Button */}
                <Button 
                    size="icon" 
                    className={cn("h-8 w-8", genToggleClassName)} 
                    onClick={handleGeneratorToggle}
                    disabled={!user}
                >
                    {settings?.generatorStatus === 'on' ? <Icons.powerOff /> : <Icons.power />}
                </Button>
            </div>
        </Card>

        {/* --- FUEL CONSUMPTION CARD --- */}
        <Card className="flex items-center p-4">
          <Icons.fuel className="h-6 w-6 text-muted-foreground mr-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Fuel Consumption</p>
            {/* Mengambil nilai 'USED 4 Hours' dari log terbaru */}
            <p className="text-xl font-bold">{latestLog ? getReading(latestLog, 'USED 4 Hours') : 'N/A'}</p>
          </div>
        </Card>

        {/* --- LOW STOCK ALERT CARD --- */}
        <Card className="flex items-center p-4">
          <Icons.alert className="h-6 w-6 text-destructive mr-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Low Stock Alerts</p>
            <p className="text-xl font-bold">{lowStockItems.length} items</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* --- RECENT LOGS TABLE --- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>RPM</TableHead>
                  <TableHead>Fuel Cons.</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map(log => {
                  const logDate = safeToDate(log.timestamp);
                  return (
                    <TableRow key={log.id}>
                      <TableCell>{logDate ? logDate.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short'}) : '...'}</TableCell>
                      <TableCell>{log.officer}</TableCell>
                      <TableCell>{getReading(log, 'RPM')}</TableCell>
                      {/* Mengambil nilai Fuel Cons yang sudah dioptimasi di getReading */}
                      <TableCell>{getReading(log, 'Fuel')}</TableCell> 
                      <TableCell className="max-w-[200px] truncate">{log.notes}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* --- PERFORMANCE CHART --- */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pl-2">
            <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 6)}
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="rpm" fill="var(--color-rpm)" radius={4} yAxisId="left" />
                    <Bar dataKey="fuel" fill="var(--color-fuel)" radius={4} yAxisId="right" />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
