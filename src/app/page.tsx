
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Clock, Fuel, Gauge } from "lucide-react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { getInitialData, type InventoryItem, type EngineLog, type AppSettings } from "@/lib/data";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { AppHeader } from "@/components/app-header";

export default function DashboardPage() {
  const [inventory] = useLocalStorage<InventoryItem[]>('inventory', getInitialData().inventory);
  const [logs] = useLocalStorage<EngineLog[]>('logs', getInitialData().logs);
  const [settings] = useLocalStorage<AppSettings>('settings', getInitialData().settings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <div className="flex flex-col gap-6">
      <AppHeader />
      {/* Stat Cards */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center p-4">
          <Clock className="h-6 w-6 text-muted-foreground mr-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">M.E Running Hours</p>
            <p className="text-xl font-bold">{(settings.runningHours || 0).toLocaleString()} hrs</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <Clock className="h-6 w-6 text-muted-foreground mr-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Generator RHS</p>
            <p className="text-xl font-bold">{(settings.generatorRunningHours || 0).toLocaleString()} hrs</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <Fuel className="h-6 w-6 text-muted-foreground mr-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Fuel Consumption</p>
            <p className="text-xl font-bold">{latestLog ? getReading(latestLog, 'USED 4 Hours') : 'N/A'}</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <AlertCircle className="h-6 w-6 text-destructive mr-4" />
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
