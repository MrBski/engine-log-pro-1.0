
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icons } from "@/components/icons";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { getInitialData, type InventoryItem, type EngineLog, type AppSettings, type ActivityLog } from "@/lib/data";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function DashboardPage() {
  const [inventory] = useLocalStorage<InventoryItem[]>('inventory', []);
  const [logs] = useLocalStorage<EngineLog[]>('logs', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('settings', getInitialData().settings);
  const [activityLog, setActivityLog] = useLocalStorage<ActivityLog[]>('activityLog', []);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();


  const [currentGeneratorRHS, setCurrentGeneratorRHS] = useState(settings.generatorRunningHours || 0);

  useEffect(() => {
    setMounted(true);
    let interval: NodeJS.Timeout;
    if (settings.generatorStatus === 'on' && settings.generatorStartTime) {
      interval = setInterval(() => {
        const elapsedSeconds = (Date.now() - (settings.generatorStartTime ?? 0)) / 1000;
        setCurrentGeneratorRHS((settings.generatorRunningHours || 0) + elapsedSeconds / 3600);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [settings.generatorStatus, settings.generatorStartTime, settings.generatorRunningHours]);

  useEffect(() => {
    // This effect ensures the display is updated if settings change from another tab
    setCurrentGeneratorRHS(settings.generatorRunningHours || 0);
  }, [settings.generatorRunningHours]);

  const addGeneratorActivity = (notes: string) => {
    const newActivity: ActivityLog = {
      id: `activity-${Date.now()}`,
      type: 'generator',
      timestamp: new Date().toISOString(),
      notes,
      officer: user?.name || 'System',
    };
    setActivityLog(prev => [newActivity, ...prev]);
  };


  const handleGeneratorToggle = () => {
    if (settings.generatorStatus === 'on') {
      // Turning OFF
      const endTime = Date.now();
      const startTime = settings.generatorStartTime || endTime;
      const elapsedHours = (endTime - startTime) / (1000 * 60 * 60);
      setSettings(prev => {
          const newTotal = (prev.generatorRunningHours || 0) + elapsedHours;
          return {
              ...prev,
              generatorStatus: 'off',
              generatorStartTime: null,
              generatorRunningHours: newTotal,
          }
      });
      addGeneratorActivity('Generator turned OFF');
      toast({ title: "Generator Off", description: "Running hours have been updated." });
    } else {
      // Turning ON
      setSettings(prev => ({
        ...prev,
        generatorStatus: 'on',
        generatorStartTime: Date.now(),
      }));
      addGeneratorActivity('Generator turned ON');
      toast({ title: "Generator On", description: "Running hours tracking started." });
    }
  };

  const handleGeneratorReset = () => {
     setSettings(prev => ({
        ...prev,
        generatorRunningHours: 0,
        generatorStartTime: prev.generatorStatus === 'on' ? Date.now() : null,
      }));
      setCurrentGeneratorRHS(0);
      addGeneratorActivity('Generator RHS Reset');
      toast({ title: "Generator RHS Reset", description: "Running hours have been reset to 0." });
  };


  const lowStockItems = inventory.filter(item => item.stock <= item.lowStockThreshold);
  const latestLog = logs.length > 0 ? logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] : null;
  const recentLogs = logs.slice(0, 5);

  const getReading = (log: EngineLog, key: string) => {
    const reading = log.readings.find(r => r.key.toLowerCase().includes(key.toLowerCase()));
    return reading ? `${reading.value} ${reading.unit}` : 'N/A';
  }

  const chartData = logs.slice(0, 7).reverse().map(log => ({
    date: new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rpm: parseFloat(log.readings.find(r => r.key.includes('RPM'))?.value || '0'),
    fuel: parseFloat(log.readings.find(r => r.key.includes('Fuel'))?.value || '0'),
  }));

  const chartConfig = {
    rpm: {
      label: "RPM",
      color: "hsl(var(--chart-1))",
    },
    fuel: {
        label: "Fuel (L/hr)",
        color: "hsl(var(--chart-2))",
    }
  };

  if (!mounted) {
    return (
      <>
        <AppHeader />
        {/* You can add skeleton loaders here */}
      </>
    );
  }

  const getTotalElapsedSeconds = () => {
    if (settings.generatorStatus === 'on' && settings.generatorStartTime) {
      const elapsed = (Date.now() - settings.generatorStartTime) / 1000;
      return (settings.generatorRunningHours || 0) * 3600 + elapsed;
    }
    return (settings.generatorRunningHours || 0) * 3600;
  };

  return (
    <div className="flex flex-col gap-6">
      <AppHeader />
      {/* Stat Cards */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col p-4 justify-between">
          <div className="flex items-center">
            <Icons.clock className="h-6 w-6 text-muted-foreground mr-4" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">M.E Running Hours</p>
              <p className="text-xl font-bold">{(settings.runningHours || 0).toLocaleString()} hrs</p>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col p-4 justify-between">
            <div>
              <div className="flex items-center">
                <Icons.clock className="h-6 w-6 text-muted-foreground mr-4" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Generator RHS</p>
                   <p className="text-xl font-bold">{formatDuration(getTotalElapsedSeconds())}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8"><Icons.reset /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Reset Generator RHS?</AlertDialogTitle><AlertDialogDescription>This will reset the running hours to 0. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleGeneratorReset}>Reset</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button 
                    size="icon" 
                    className={cn("h-8 w-8", settings.generatorStatus === 'on' ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600")}
                    onClick={handleGeneratorToggle}
                >
                    {settings.generatorStatus === 'on' ? <Icons.powerOff /> : <Icons.power />}
                </Button>
            </div>
        </Card>
        <Card className="flex items-center p-4">
          <Icons.fuel className="h-6 w-6 text-muted-foreground mr-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Fuel Consumption</p>
            <p className="text-xl font-bold">{latestLog ? getReading(latestLog, 'USED 4 Hours') : 'N/A'}</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <Icons.alert className="h-6 w-6 text-destructive mr-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Low Stock Alerts</p>
            <p className="text-xl font-bold">{lowStockItems.length} items</p>
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Logs Table */}
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
                {recentLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short'})}</TableCell>
                    <TableCell>{log.officer}</TableCell>
                    <TableCell>{getReading(log, 'RPM')}</TableCell>
                    <TableCell>{getReading(log, 'Fuel')}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{log.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Performance Chart */}
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
