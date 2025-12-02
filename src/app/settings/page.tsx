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
import { Separator } from '@/components/ui/separator';

// --- 1. SKEMA VALIDASI (ZOD) ---

// Skema untuk formulir Pengaturan Kapal (Membutuhkan PIN)
const settingsSchema = z.object({
  shipName: z.string().min(1, 'Ship name is required.'),
  runningHours: z.coerce.number().min(0, 'Running hours cannot be negative.'),
  generatorRunningHours: z.coerce.number().min(0, 'Running hours cannot be negative.'),
});

// Skema untuk memperbarui nama/posisi officer
const officerNameSchema = z.object({
  name: z.string().min(1, 'Officer name is required.'),
});

// Skema untuk formulir Login
const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required'),
});

// --- 2. KONSTANTA KRITIS (REKOMENDASI: Pindahkan ke src/lib/constants.ts) ---
const HARDCODED_PIN = "1234";

// --- KOMPONEN UTAMA SETTINGS ---

export default function SettingsPage() {
  const { settings, updateSettings, settingsLoading } = useData();
  const { user, login, logout, updateUserName } = useAuth();
  const { toast } = useToast();

  // --- STATE MODAL PIN & DATA TERTUNDA ---
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingSettings, setPendingSettings] = useState<z.infer<typeof settingsSchema> | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Instance Form: Settings Ship Details
  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
  });

  // Instance Form: Officer Name
  const officerNameForm = useForm<z.infer<typeof officerNameSchema>>({
    resolver: zodResolver(officerNameSchema),
  });

  // Instance Form: Login
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // --- EFFECT: INILISASI FORM ---
  /**
   * @description Memuat data settings dan user ke dalam formulir saat data tersedia.
   */
  useEffect(() => {
    if(settings) {
        settingsForm.reset({
            shipName: settings.shipName,
            runningHours: settings.runningHours || 0,
            generatorRunningHours: settings.generatorRunningHours || 0,
        });
    }
    if (user) {
        officerNameForm.reset({ name: user.name });
    }
  }, [settings, user, settingsForm, officerNameForm]);


  // --- 3. MUTATOR HANDLERS ---

  /**
   * @description Menangani submit Pengaturan Kapal (membutuhkan PIN).
   * Menyimpan data form sementara ke state pendingSettings dan membuka modal PIN.
   */
  const handleSettingsSubmit = (values: z.infer<typeof settingsSchema>) => {
    setPendingSettings(values); // Simpan data yang akan di-update
    setIsPinDialogOpen(true);   // Buka modal PIN
    setPin('');
    setPinError('');
  };

  /**
   * @description Memverifikasi PIN dan melakukan update AppSettings jika PIN benar.
   */
  const handlePinConfirm = async () => {
    // 1. PIN Check
    if (pin !== HARDCODED_PIN) {
        setPinError('Incorrect PIN. Please try again.');
        return;
    }

    if (!pendingSettings) return;

    // 2. Eksekusi Update Settings
    try {
      await updateSettings(pendingSettings);
      toast({ title: 'Success', description: 'Settings updated.' });
      setIsPinDialogOpen(false);
      setPendingSettings(null);
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    }
  };

  /**
   * @description Memperbarui nama/posisi officer di Firebase Auth Profile.
   */
  const handleOfficerNameSubmit = async (values: z.infer<typeof officerNameSchema>) => {
    try {
        await updateUserName(values.name); // Memanggil update dari useAuth
        toast({ title: "Officer Name Updated", description: `Your name is now set to "${values.name}".`});
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to update your name.' });
    }
  };

  /**
   * @description Menangani proses Login user.
   */
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

  // --- 4. LOGIC DATA VIEW ---

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

        {/* --- CARD 1: ACCOUNT & SYNC --- */}
        <Card>
          <CardHeader>
            <CardTitle>Account & Sync</CardTitle>
            <CardDescription>Login to sync data and set your officer name.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoggedIn ? (
              <div className="space-y-4">
                {/* Form Update Officer Name */}
                 <Form {...officerNameForm}>
                    <form onSubmit={officerNameForm.handleSubmit(handleOfficerNameSubmit)} className="space-y-4">
                        <FormField
                            control={officerNameForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Officer Name/Position</FormLabel>
                                    <FormControl><Input placeholder="e.g. Chief Engineer" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="sm">Set Name</Button>
                    </form>
                </Form>

                <Separator className="my-6" />

                <div className="space-y-2">
                    <p className="text-sm">You are logged in as <span className="font-semibold">{user?.email}</span>.</p>
                    <p className="text-sm text-muted-foreground">Your data is being synced automatically when online.</p>
                    <Button variant="outline" onClick={logout}>
                        <Icons.logout className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
              </div>
            ) : (
              // Form Login
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

        {/* --- CARD 2: SHIP DETAILS (Requires PIN) --- */}
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

         {/* --- CARD 3: LOGBOOK CONFIGURATION LINK --- */}
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

       {/* Modal: PIN Confirmation for Settings Update */}
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
