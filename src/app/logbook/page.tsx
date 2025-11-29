"use client";

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { getInitialData, type EngineLog, type AppSettings } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

const logSchema = z.object({
  officer: z.string().min(1, "Officer is required."),
  rpm: z.string().min(1, "RPM is required."),
  fuel: z.string().min(1, "Fuel Consumption is required."),
  pressure: z.string().min(1, "Oil Pressure is required."),
  notes: z.string().optional(),
});

export default function LogbookPage() {
  const [logs, setLogs] = useLocalStorage<EngineLog[]>('logs', getInitialData().logs);
  const [settings] = useLocalStorage<AppSettings>('settings', getInitialData().settings);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof logSchema>>({
    resolver: zodResolver(logSchema),
    defaultValues: {
        officer: "",
        rpm: "",
        fuel: "",
        pressure: "",
        notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof logSchema>) {
    const newLog: EngineLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      officer: values.officer,
      readings: [
        { id: 'r1', key: 'Main Engine RPM', value: values.rpm, unit: 'rpm' },
        { id: 'r2', key: 'Fuel Consumption', value: values.fuel, unit: 'L/hr' },
        { id: 'r3', key: 'Oil Pressure', value: values.pressure, unit: 'bar' },
      ],
      notes: values.notes || 'No notes.',
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);
    toast({ title: "Success", description: "New engine log has been recorded." });
    form.reset();
    setIsDialogOpen(false);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Engine Logbook</CardTitle>
          <CardDescription>All recorded engine activities.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> New Log
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Engine Log</DialogTitle>
              <DialogDescription>Record the current engine readings.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="officer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Officer on Watch</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an officer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {settings.officers.map(officer => (
                            <SelectItem key={officer} value={officer}>{officer}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="rpm" render={({ field }) => (
                        <FormItem><FormLabel>RPM</FormLabel><FormControl><Input placeholder="85" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="fuel" render={({ field }) => (
                        <FormItem><FormLabel>Fuel (L/hr)</FormLabel><FormControl><Input placeholder="150" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="pressure" render={({ field }) => (
                        <FormItem><FormLabel>Pressure (bar)</FormLabel><FormControl><Input placeholder="4.5" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any observations..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Save Log</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Officer</TableHead>
              <TableHead>Readings</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                <TableCell>{log.officer}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    {log.readings.map(r => <span key={r.id} className="text-xs">{r.key}: {r.value} {r.unit}</span>)}
                  </div>
                </TableCell>
                <TableCell className="max-w-[300px] truncate">{log.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
