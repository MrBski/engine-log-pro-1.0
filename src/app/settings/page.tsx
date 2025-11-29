"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { getInitialData, type AppSettings } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus } from 'lucide-react';

const settingsSchema = z.object({
  shipName: z.string().min(1, 'Ship name is required.'),
});

const newOfficerSchema = z.object({
  name: z.string().min(1, 'Officer name is required.'),
});

export default function SettingsPage() {
  const [settings, setSettings] = useLocalStorage<AppSettings>('settings', getInitialData().settings);
  const { toast } = useToast();

  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    values: { shipName: settings.shipName },
  });

  const newOfficerForm = useForm<z.infer<typeof newOfficerSchema>>({
    resolver: zodResolver(newOfficerSchema),
    defaultValues: { name: '' },
  });

  const handleUpdateSettings = (values: z.infer<typeof settingsSchema>) => {
    setSettings(prev => ({ ...prev, shipName: values.shipName }));
    toast({ title: 'Success', description: 'Ship name updated.' });
  };

  const handleAddOfficer = (values: z.infer<typeof newOfficerSchema>) => {
    if (settings.officers.includes(values.name)) {
      newOfficerForm.setError('name', { message: 'Officer already exists.' });
      return;
    }
    setSettings(prev => ({ ...prev, officers: [...prev.officers, values.name] }));
    newOfficerForm.reset();
  };

  const handleRemoveOfficer = (officerToRemove: string) => {
    setSettings(prev => ({ ...prev, officers: prev.officers.filter(o => o !== officerToRemove) }));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ship Details</CardTitle>
          <CardDescription>Update general ship information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(handleUpdateSettings)} className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="shipName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ship Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Save Changes</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Manage Officers</CardTitle>
          <CardDescription>Add or remove officers on watch.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...newOfficerForm}>
            <form onSubmit={newOfficerForm.handleSubmit(handleAddOfficer)} className="flex items-start gap-2">
              <FormField
                control={newOfficerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">New Officer Name</FormLabel>
                    <FormControl><Input placeholder="e.g. 3rd Engineer" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="icon"><UserPlus className="h-4 w-4" /></Button>
            </form>
          </Form>
          <div className="space-y-2">
            {settings.officers.map(officer => (
              <div key={officer} className="flex items-center justify-between rounded-md border p-3">
                <span className="text-sm font-medium">{officer}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveOfficer(officer)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
