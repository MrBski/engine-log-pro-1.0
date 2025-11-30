
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { AppHeader } from '@/components/app-header';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const settingsSchema = z.object({
  shipName: z.string().min(1, 'Ship name is required.'),
  runningHours: z.coerce.number().min(0, 'Running hours cannot be negative.'),
  generatorRunningHours: z.coerce.number().min(0, 'Running hours cannot be negative.'),
});

const newOfficerSchema = z.object({
  name: z.string().min(1, 'Officer name is required.'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required'),
});

const HARDCODED_PIN = "1234";

export default function SettingsPage() {
  const { settings, updateSettings, settingsLoading } = useData();
  const { user, login, logout } = useAuth();
  const { toast } = useToast();
  
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingSettings, setPendingSettings] = useState<z.infer<typeof settingsSchema> | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
  });
  
  useEffect(() => {
    if(settings) {
        settingsForm.reset({
            shipName: settings.shipName,
            runningHours: settings.runningHours || 0,
            generatorRunningHours: settings.generatorRunningHours || 0,
        });
    }
  }, [settings, settingsForm]);

  const newOfficerForm = useForm<z.infer<typeof newOfficerSchema>>({
    resolver: zodResolver(newOfficerSchema),
    defaultValues: { name: '' },
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSettingsSubmit = (values: z.infer<typeof settingsSchema>) => {
    setPendingSettings(values);
    setIsPinDialogOpen(true);
    setPin('');
    setPinError('');
  };

  const handlePinConfirm = async () => {
    if (pin !== HARDCODED_PIN) {
        setPinError('Incorrect PIN. Please try again.');
        return;
    }

    if (!pendingSettings) return;

    try {
      await updateSettings(pendingSettings);
      toast({ title: 'Success', description: 'Settings updated.' });
      setIsPinDialogOpen(false);
      setPendingSettings(null);
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    }
  };


  const handleAddOfficer = async (values: z.infer<typeof newOfficerSchema>) => {
    if (!settings) return;
    const currentOfficers = settings.officers || [];
    if (currentOfficers.includes(values.name)) {
      newOfficerForm.setError('name', { message: 'Officer already exists.' });
      return;
    }
    try {
        await updateSettings({ officers: [...currentOfficers, values.name] });
        newOfficerForm.reset();
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add officer.' });
    }
  };

  const handleRemoveOfficer = async (officerToRemove: string) => {
    if (!settings) return;
    try {
        const currentOfficers = settings.officers || [];
        await updateSettings({ officers: currentOfficers.filter(o => o !== officerToRemove) });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove officer.' });
    }
  };

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      await login(values.email, values.password);
      toast({ title: 'Login Successful', description: 'Data sync is now active.' });
      loginForm.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid email or password.',
      });
    }
  };

  if (settingsLoading) {
      return (
          <>
          <AppHeader />
          <div className="text-center">Loading settings...</div>
          </>
      )
  }

  const isLoggedIn = user?.uid !== 'guest-user';

  return (
    <div className="flex flex-col gap-6">
      <AppHeader />
      <div className="grid gap-6 md:grid-cols-2">

        <Card>
          <CardHeader>
            <CardTitle>Account & Sync</CardTitle>
            <CardDescription>Login to sync your data to the cloud.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoggedIn ? (
              <div className="space-y-4">
                <p className="text-sm">You are logged in as <span className="font-semibold">{user?.email}</span>.</p>
                <p className="text-sm text-muted-foreground">Your data is being synced automatically when online.</p>
                <Button variant="outline" onClick={logout}>
                  <Icons.logout className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField control={loginForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="chief@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={loginForm.formState.isSubmitting}>
                    {loginForm.formState.isSubmitting ? 'Logging in...' : 'Login & Sync'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {settings && (
          <Card>
            <CardHeader>
              <CardTitle>Ship Details</CardTitle>
              <CardDescription>Update general ship information. Requires PIN.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-4">
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
                  <FormField
                    control={settingsForm.control}
                    name="runningHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>M.E. Total Running Hours</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="generatorRunningHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Generator Total RHS</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={!isLoggedIn}>
                    {isLoggedIn ? 'Save Changes' : 'Login to make changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
        
        {settings && (
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
                      <FormControl><Input placeholder="e.g. 3rd Engineer" {...field} disabled={!isLoggedIn} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="icon" disabled={!isLoggedIn}><Icons.userPlus className="h-4 w-4" /></Button>
              </form>
            </Form>
            <div className="space-y-2">
              {(settings.officers || []).map(officer => (
                <div key={officer} className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm font-medium">{officer}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveOfficer(officer)} disabled={!isLoggedIn}>
                    <Icons.trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

         <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Logbook Configuration</CardTitle>
                <CardDescription>Customize the sections and fields that appear in the engine logbook.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild variant="outline" disabled={!isLoggedIn}>
                    <Link href="/settings/logbook">
                        <Icons.book className="mr-2 h-4 w-4" />
                        Customize Logbook
                    </Link>
                </Button>
            </CardContent>
         </Card>
      </div>

       <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              To protect sensitive data, please enter your 4-digit PIN to save these changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError('');
              }}
              className="text-center font-mono text-2xl tracking-widest"
            />
            {pinError && <p className="text-sm text-destructive">{pinError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePinConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
