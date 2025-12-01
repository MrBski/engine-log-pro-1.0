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

// Helper format durasi
function formatDuration(seconds: number) {
    if (isNaN(seconds)) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

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

export default function DashboardPage() {
  const { 
    inventory, logs, settings, 
    updateSettings, addActivityLog, 
    loading, settingsLoading, inventoryLoading, logsLoading 
  } = useData();
  
  const [mounted, setMounted] = useState(false);
  
  // State untuk timer real-time
  const [genElapsed, setGenElapsed] = useState(0); 
  const [meElapsed, setMeElapsed] = useState(0);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- LOGIC TIMER (Generator & ME) ---
  useEffect(() => {
    if (!settings) return;

    // Fungsi hitung awal
    const calculateSeconds = (totalHours: number, startTime: number | null | undefined, status: string | undefined) => {
        if (status === 'on' && startTime) {
            const elapsed = (Date.now() - startTime) / 1000;
            return (totalHours * 3600) + elapsed;
        }
        return totalHours * 3600;
    };

    // Set nilai awal
    setGenElapsed(calculateSeconds(settings.generatorRunningHours || 0, settings.generatorStartTime, settings.generatorStatus));
    setMeElapsed(calculateSeconds(settings.runningHours || 0, settings.mainEngineStartTime, settings.mainEngineStatus)); // Asumsi field baru: mainEngineStartTime

    // Interval update setiap detik
    const interval = setInterval(() => {
        if (settings.generatorStatus === 'on' && settings.generatorStartTime) {
            const elapsed = (Date.now() - settings.generatorStartTime) / 1000;
            setGenElapsed(((settings.generatorRunningHours || 0) * 3600) + elapsed);
        }
        
        // Cek status ME (Asumsi field settings.mainEngineStatus ada)
        if (settings.mainEngineStatus === 'on' && settings.mainEngineStartTime) {
            const elapsed = (Date.now() - settings.mainEngineStartTime) / 1000;
            setMeElapsed(((settings.runningHours || 0) * 3600) + elapsed);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);


  // --- HANDLER GENERATOR ---
  const handleGeneratorToggle = async () => {
    if (!settings || !user || !user.name) return;
    if (settings.generatorStatus === 'on') {
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
      try {
        await updateSettings({ generatorStatus: 'on', generatorStartTime: Date.now() });
        await addActivityLog({ type: 'generator', timestamp: new Date(), notes: 'Generator turned ON', officer: user.name });
      } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed update." }); }
    }
  };

  const handleGeneratorReset = async () => {
     if (!settings || !user || !user.name) return;
     try {
        await updateSettings({
            generatorRunningHours: 0,
            generatorStartTime: settings.generatorStatus === 'on' ? Date.now() : null,
        });
        await addActivityLog({ type: 'generator', timestamp: new Date(), notes: 'Generator RHS Reset', officer: user.name });
        toast({ title: "Reset", description: "Generator hours reset." });
     } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed reset." }); }
  };

  // --- HANDLER MAIN ENGINE (Baru) ---
  const handleMEToggle = async () => {
    if (!settings || !user || !user.name) return;
    
    // Asumsi field baru di settings: mainEngineStatus, mainEngineStartTime, runningHours(sudah ada)
    const isMeOn = settings.mainEngineStatus === 'on';

    if (isMeOn) {
      // Turn OFF ME
      const endTime = Date.now();
      const startTime = settings.mainEngineStartTime || endTime;
      const elapsedHours = (endTime - startTime) / (1000 * 60 * 60);
      try {
        await updateSettings({
            mainEngineStatus: 'off',
            mainEngineStartTime: null,
            runningHours: (settings.runningHours || 0) + elapsedHours,
        });
        await addActivityLog({ type: 'main_engine', timestamp: new Date(), notes: 'M.E. Stopped (FWE)', officer: user.name });
        toast({ title: "M.E. Stopped", description: "Running hours updated." });
      } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed to stop M.E." }); }
    } else {
      // Turn ON ME
      try {
        await updateSettings({
            mainEngineStatus: 'on',
            mainEngineStartTime: Date.now(),
        });
        await addActivityLog({ type: 'main_engine', timestamp: new Date(), notes: 'M.E. Started (SBE)', officer: user.name });
        toast({ title: "M.E. Started", description: "Tracking started." });
      } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed to start M.E." }); }
    }
  };


  // --- DATA VISUALIZATION ---
  const lowStockItems = (inventory || []).filter(item => item.stock <= item.lowStockThreshold);
  const sortedLogs = [...(logs || [])].sort((a, b) => {
    const dateA = safeToDate(a.timestamp);
    const dateB = safeToDate(b.timestamp);
    if (!dateA || !dateB) return 0;
    return dateB.getTime() - dateA.getTime();
  });
  const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
  const recentLogs = sortedLogs.slice(0, 5);
  const getReading = (log: EngineLog, key: string) => {
    if (!log.readings) return 'N/A';
    const reading = log.readings.find(r => r.key.toLowerCase().includes(key.toLowerCase()));
    return reading ? `${reading.value} ${reading.unit}` : 'N/A';
  }
  const chartData = sortedLogs.slice(0, 7).reverse().map(log => {
    const logDate = safeToDate(log.timestamp);
    return {
        date: logDate ? logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        rpm: parseFloat(log.readings.find(r => r.key.includes('RPM'))?.value || '0'),
        fuel: parseFloat(log.readings.find(r => r.key.includes('Fuel'))?.value || '0'),
    }
  });
  const chartConfig = {
    rpm: { label: "RPM", color: "hsl(var(--chart-1))" },
    fuel: { label: "Fuel (L/hr)", color: "hsl(var(--chart-2))" }
  };

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

  if (!settings) return <div>Data Error</div>;

  // CSS Class untuk efek Ambient Hijau
  const activeCardClass = "border-green-500 ring-1 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all duration-300";

  return (
    <div className="flex flex-col gap-6">
      <AppHeader />
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        
        {/* --- MAIN ENGINE CARD --- */}
        <Card className={cn("flex flex-col p-4 justify-between transition-all", settings.mainEngineStatus === 'on' ? activeCardClass : "")}>
          <div className="flex-1">
              <div className="flex items-start">
                <Icons.clock className={cn("h-6 w-6 mr-4", settings.mainEngineStatus === 'on' ? "text-green-500 animate-pulse" : "text-muted-foreground")} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">M.E Running Hours</p>
                  <p className="text-xl font-bold">{formatDuration(meElapsed)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                      Status: {settings.mainEngineStatus === 'on' ? <span className="text-green-500 font-bold">RUNNING</span> : "STOPPED"}
                  </p>
                </div>
              </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
                 <Button 
                    size="icon" 
                    className={cn("h-8 w-8", settings.mainEngineStatus === 'on' ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600")}
                    onClick={handleMEToggle}
                    disabled={!user}
                >
                    {settings.mainEngineStatus === 'on' ? <Icons.powerOff /> : <Icons.power />}
                </Button>
            </div>
        </Card>

        {/* --- GENERATOR CARD --- */}
        <Card className={cn("flex flex-col p-4 justify-between transition-all", settings.generatorStatus === 'on' ? activeCardClass : "")}>
            <div className="flex-1">
              <div className="flex items-start">
                <Icons.clock className={cn("h-6 w-6 mr-4", settings.generatorStatus === 'on' ? "text-green-500 animate-pulse" : "text-muted-foreground")} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Generator RHS</p>
                   <p className="text-xl font-bold">{formatDuration(genElapsed)}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
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
                <Button 
                    size="icon" 
                    className={cn("h-8 w-8", settings?.generatorStatus === 'on' ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600")}
                    onClick={handleGeneratorToggle}
                    disabled={!user}
                >
                    {settings?.generatorStatus === 'on' ? <Icons.powerOff /> : <Icons.power />}
                </Button>
            </div>
        </Card>

        {/* --- FUEL CARD --- */}
        <Card className="flex items-center p-4">
          <Icons.fuel className="h-6 w-6 text-muted-foreground mr-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Fuel Consumption</p>
            <p className="text-xl font-bold">{latestLog ? getReading(latestLog, 'USED 4 Hours') : 'N/A'}</p>
          </div>
        </Card>

        {/* --- ALERTS CARD --- */}
        <Card className="flex items-center p-4">
          <Icons.alert className="h-6 w-6 text-destructive mr-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Low Stock Alerts</p>
            <p className="text-xl font-bold">{lowStockItems.length} items</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ... (BAGIAN TABLE DAN CHART TIDAK BERUBAH, SAMA SEPERTI SEBELUMNYA) ... */}
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
                      <TableCell>{getReading(log, 'Fuel')}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.notes}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
