"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Ship, Warehouse } from "lucide-react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { getInitialData, type InventoryItem, type EngineLog } from "@/lib/data";
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ChartTooltipContent } from "@/components/ui/chart";

export default function DashboardPage() {
  const [inventory] = useLocalStorage<InventoryItem[]>('inventory', getInitialData().inventory);
  const [logs] = useLocalStorage<EngineLog[]>('logs', getInitialData().logs);

  const lowStockItems = inventory.filter(item => item.stock <= item.lowStockThreshold);
  const latestLog = logs.length > 0 ? logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] : null;

  const chartData = inventory.slice(0, 5).map(item => ({
    name: item.name,
    stock: item.stock,
    threshold: item.lowStockThreshold,
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Latest Engine Report</CardTitle>
          <Ship className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {latestLog ? (
            <div>
              <div className="text-2xl font-bold">{latestLog.officer}'s Watch</div>
              <p className="text-xs text-muted-foreground">
                {new Date(latestLog.timestamp).toLocaleString()}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {latestLog.readings.map(reading => (
                  <div key={reading.id}>
                    <p className="text-sm text-muted-foreground">{reading.key}</p>
                    <p className="text-lg font-semibold">{reading.value} <span className="text-sm font-normal">{reading.unit}</span></p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground italic">Notes: {latestLog.notes}</p>
            </div>
          ) : (
            <p>No engine logs recorded yet.</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Inventory Alert</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          {lowStockItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{item.stock} {item.unit}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full pt-8">
                <Warehouse className="size-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">All stock levels are healthy.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Inventory Overview</CardTitle>
          <CardDescription>A quick look at current stock levels.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent />} />
              <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
