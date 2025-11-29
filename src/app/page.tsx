
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icons } from "@/components/icons";
import { type EngineLog } from "@/lib/data";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useData } from "@/hooks/use-data";
import type { Timestamp } from "firebase/firestore";

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const safeToDate = (timestamp: Timestamp | Date | string | undefined): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return null;
};

export default function DashboardPage() {
  const { inventory = [], logs = [], settings, updateSettings, addActivityLog, loading } = useData();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGeneratorToggle = async () => {
    if (!settings) return;
    if (settings.generatorStatus === 'on') {
      // Turning OFF
      const endTime = Date.now();
      const startTime = settings.generatorStartTime || endTime;
      const elapsedHours = (endTime - startTime) / (1000 * 60 * 60);
      try {
        await updateSettings({
            generatorStatus: 'off',
            generatorStartTime: null,
            generatorRunningHours: (settings.generatorRunningHours || 0) + elapsedHours,
        });
        await addActivityLog({
            type: 'generator',
            timestamp: new Date(),
            notes: 'Generator turned OFF',
            officer: user?.name || 'System',
        });
        toast({ title: "Generator Off", description: "Running hours have been updated." });
      } catch (error) {
         toast({ variant: "destructive", title: "Error", description: "Failed to turn off generator." });
      }
    } else {
      // Turning ON
      try {
        await updateSettings({
            generatorStatus: 'on',
            generatorStartTime: Date.now(),
        });
        await addActivityLog({
            type: 'generator',
            timestamp: new Date(),
            notes: 'Generator turned ON',
            officer: user?.name || 'System',
        });
        toast({ title: "Generator On", description: "Running hours tracking started." });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to turn on generator." });
      }
    }
  };

  const handleGeneratorReset = async () => {
     if (!settings) return;
     try {
        await updateSettings({
            generatorRunningHours: 0,
            generatorStartTime: settings.generatorStatus === 'on' ? Date.now() : null,
        });
        await addActivityLog({
            type: 'generator',
            timestamp: new Date(),
            notes: 'Generator RHS Reset',
            officer: user?.name || 'System',
        });
        toast({ title: "Generator RHS Reset", description: "Running hours have been reset to 0." });
     } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to reset generator RHS." });
     }
  };

  const lowStockItems = inventory.filter(item => item.stock <= item.lowStockThreshold);
  const latestLog = logs.length > 0 ? logs[0] : null; // Already sorted by Firestore query
  const recentLogs = logs.slice(0, 5);

  const getReading = (log: EngineLog, key: string) => {
    const reading = log.readings.find(r => r.key.toLowerCase().includes(key.toLowerCase()));
    return reading ? `${reading.value} ${reading.unit}` : 'N/A';
  }

  const chartData = logs.slice(0, 7).reverse().map(log => ({
    date: safeToDate(log.timestamp)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || '',
    rpm: parseFloat(log.readings.find(r => r.key.includes('RPM'))?.value || '0'),
    fuel: parseFloat(log.readings.find(r => r.key.includes('Fuel'))?.value || '0'),
  }));

  const chartConfig = {
    rpm: { label: "RPM", color: "hsl(var(--chart-1))" },
    fuel: { label: "Fuel (L/hr)", color: "hsl(var(--chart-2))" }
  };

  const getTotalElapsedSeconds = () => {
    if (!settings) return 0;
    if (settings.generatorStatus === 'on' && settings.generatorStartTime) {
      const elapsed = (Date.now() - settings.generatorStartTime) / 1000;
      return (settings.generatorRunningHours || 0) * 3600 + elapsed;
    }
    return (settings.generatorRunningHours || 0) * 3600;
  };

  if (!mounted || loading || !settings) {
    return (
      <>
        <AppHeader />
        <div className="text-center">Loading dashboard data...</div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AppHeader />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                      <TableCell>{logDate ? logDate.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short'}) : '...'}</TableCell>
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

    