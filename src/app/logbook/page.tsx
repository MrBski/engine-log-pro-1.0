
"use client";

import { KeyboardEvent, useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { getInitialData, type EngineLog, type AppSettings, type ActivityLog, type LogSection } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/app-header';
import { format } from 'date-fns';
import { AlertTriangle, Settings } from 'lucide-react';
import Link from 'next/link';

const readingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  unit: z.string(),
});

const logSectionSchema = z.object({
  title: z.string(),
  readings: z.array(readingSchema),
});

const logSchema = z.object({
  timestamp: z.string().min(1, "Timestamp is required"),
  sections: z.array(logSectionSchema),
  onDutyEngineer: z.string().min(1, "On Duty Engineer name is required."),
  dutyEngineerPosition: z.string().min(1, "On Duty Engineer position is required."),
  condition: z.string().optional(),
});

type LogFormData = z.infer<typeof logSchema>;

const sectionColors: { [key: string]: string } = {
    'M.E Port Side': 'bg-red-600',
    'M.E Starboard': 'bg-green-600',
    'Generator': 'bg-sky-600',
    'Daily Tank': 'bg-purple-600',
    'Flowmeter': 'bg-amber-600',
    'Daily Tank Before On Duty': 'bg-cyan-600',
    'Others': 'bg-slate-500'
};

export default function LogbookPage() {
  const [logs, setLogs] = useLocalStorage<EngineLog[]>('logs', getInitialData().logs);
  const [activityLog, setActivityLog] = useLocalStorage<ActivityLog[]>('activityLog', getInitialData().activityLog);
  const [settings] = useLocalStorage<AppSettings>('settings', getInitialData().settings);
  const [logbookSections, setLogbookSections] = useLocalStorage<LogSection[]>('logbookSections', getInitialData().logbookSections);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<LogFormData>({
    resolver: zodResolver(logSchema),
  });
  
  useEffect(() => {
    if (isClient) {
      const dynamicDefaultValues = {
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        sections: logbookSections.map(section => ({
          ...section,
          readings: section.readings.map(r => ({...r, value: ''}))
        })),
        onDutyEngineer: settings.officers.length > 0 ? settings.officers[0] : '',
        dutyEngineerPosition: "Chief Engineer",
        condition: ""
      };
      form.reset(dynamicDefaultValues);
      setIsLoading(false);
    }
  }, [isClient, logbookSections, settings.officers, form]);
  

  const { fields: sectionFields } = useFieldArray({
    control: form.control,
    name: "sections",
  });

  const watchedSections = form.watch('sections');
  
  useEffect(() => {
    if (!watchedSections) return;

    let onDutyBeforeValue: string | undefined;
    let dailyTankBeforeValue: string | undefined;

    watchedSections.forEach(section => {
        section.readings.forEach(reading => {
            if (reading.id === 'onduty_before') {
                onDutyBeforeValue = reading.value;
            }
            if (reading.id === 'daily_before') {
                dailyTankBeforeValue = reading.value;
            }
        });
    });
    
    let used4HoursSectionIndex: number | undefined;
    let used4HoursReadingIndex: number | undefined;

    logbookSections.forEach((section, sIdx) => {
        const rIdx = section.readings.findIndex(r => r.id === 'other_used');
        if (rIdx !== -1) {
            used4HoursSectionIndex = sIdx;
            used4HoursReadingIndex = rIdx;
        }
    });

    if (used4HoursSectionIndex !== undefined && used4HoursReadingIndex !== undefined) {
      if (onDutyBeforeValue != null && dailyTankBeforeValue != null && onDutyBeforeValue !== '' && dailyTankBeforeValue !== '') {
          const onDutyBefore = parseFloat(onDutyBeforeValue);
          const dailyTankBefore = parseFloat(dailyTankBeforeValue);
          
          if (!isNaN(onDutyBefore) && !isNaN(dailyTankBefore)) {
              const used4Hours = Math.round(((onDutyBefore - dailyTankBefore) * 21) / 4);
              form.setValue(`sections.${used4HoursSectionIndex}.readings.${used4HoursReadingIndex}.value`, used4Hours.toString(), { shouldDirty: true, shouldValidate: false });
          } else {
            form.setValue(`sections.${used4HoursSectionIndex}.readings.${used4HoursReadingIndex}.value`, "", { shouldDirty: true, shouldValidate: false });
          }
      } else {
        form.setValue(`sections.${used4HoursSectionIndex}.readings.${used4HoursReadingIndex}.value`, "", { shouldDirty: true, shouldValidate: false });
      }
    }

  }, [watchedSections, form, logbookSections]);

  function onSubmit(values: LogFormData) {
    const newLog: EngineLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date(values.timestamp).toISOString(),
      officer: values.onDutyEngineer,
      readings: values.sections.flatMap(s => 
        s.readings.map(r => ({
          id: r.id,
          key: `${s.title} - ${r.key}`,
          value: r.value,
          unit: r.unit,
        }))
      ),
      notes: values.condition || 'No conditions noted.',
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);

    const newActivity: ActivityLog = {
        ...newLog,
        type: 'engine',
        name: 'Engine Log Entry', 
        category: 'main-engine' 
    };
    setActivityLog(prev => [newActivity, ...prev]);

    toast({ title: "Success", description: "New engine log has been recorded." });
    
    // Reset form with dynamic sections
    const resetValues = {
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        sections: logbookSections.map(section => ({
            ...section,
            readings: section.readings.map(r => ({...r, value: ''}))
        })),
        onDutyEngineer: settings.officers.length > 0 ? settings.officers[0] : '',
        dutyEngineerPosition: "Chief Engineer",
        condition: ""
    };
    form.reset(resetValues);
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (!form) return;

      const focusable = Array.from(form.querySelectorAll('input:not([readonly]), textarea, button, select'));
      const index = focusable.indexOf(e.currentTarget);
      
      const nextElement = focusable[index + 1];
      if (nextElement && nextElement instanceof HTMLElement) {
          nextElement.focus();
          nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  if (!isClient || isLoading) {
    return (
        <div className="flex flex-col gap-6">
            <AppHeader />
            <Card>
                <CardHeader>
                    <CardTitle className="text-center">New Engine Log Sheet</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p>Loading Logbook...</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (logbookSections.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <AppHeader />
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-center">Logbook Not Configured</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <p className="text-muted-foreground">
                    Your logbook sheet is empty. Please configure the sections and fields you want to track.
                </p>
                <Button asChild>
                    <Link href="/settings/logbook">
                        <Settings className="mr-2 h-4 w-4" /> Configure Logbook
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  const findReadingById = (id: string) => {
    for (const section of logbookSections) {
      for (const reading of section.readings) {
        if (reading.id === id) {
          return reading;
        }
      }
    }
    return null;
  }
  
  return (
    <div className="flex flex-col gap-6">
      <AppHeader />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-center">New Engine Log Sheet</CardTitle>
           <Button variant="ghost" size="icon" asChild>
                <Link href="/settings/logbook">
                    <Settings className="h-5 w-5" />
                </Link>
            </Button>
        </CardHeader>
        <CardContent className="max-w-md mx-auto space-y-4 text-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="timestamp"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        className="h-12 text-lg font-bold text-center" 
                        {...field}
                        onKeyDown={handleKeyDown}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {sectionFields.map((section, sectionIndex) => (
                <div key={section.id} className="space-y-3">
                  <h3 className={`font-bold text-center p-2 my-2 rounded-md text-primary-foreground text-sm ${sectionColors[section.title] || 'bg-gray-500'}`}>
                    {section.title}
                  </h3>
                  {section.readings.map((reading, readingIndex) => {
                    const originalReading = findReadingById(reading.id);
                    const isReadOnly = originalReading?.id === 'other_used';
                    return (
                        <FormField
                        key={reading.id}
                        control={form.control}
                        name={`sections.${sectionIndex}.readings.${readingIndex}.value`}
                        render={({ field }) => (
                            <FormItem className="flex items-center">
                            <FormLabel className="w-1/2 text-sm font-medium">{originalReading?.key || 'N/A'}</FormLabel>
                            <FormControl>
                                <Input
                                type="tel"
                                inputMode="decimal"
                                className={`h-8 bg-card-foreground/5 text-right text-sm ${isReadOnly ? 'font-bold' : ''}`}
                                readOnly={isReadOnly}
                                {...field}
                                value={field.value ?? ''}
                                onKeyDown={handleKeyDown}
                                />
                            </FormControl>
                            </FormItem>
                        )}
                        />
                    )
                  })}
                </div>
              ))}
              
              <div className="pt-4 space-y-2">
                <h3 className="text-muted-foreground bg-muted p-2 my-2 rounded-md text-center font-bold text-sm">On Duty Engineer</h3>
                <FormField
                  control={form.control}
                  name="onDutyEngineer"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                          <Input className="h-8 bg-card-foreground/5 text-center font-semibold" placeholder="Engineer Name" {...field} onKeyDown={handleKeyDown} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="dutyEngineerPosition"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                          <Input className="h-8 bg-card-foreground/5 text-center font-semibold" placeholder="Position" {...field} onKeyDown={handleKeyDown} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

               <div className="pt-4">
                <h3 className="text-muted-foreground bg-muted p-2 my-2 rounded-md text-center font-bold text-sm">Condition</h3>
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea className="font-bold text-center" placeholder="Any observations..." {...field} onKeyDown={handleKeyDown} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="pt-4">
                <Button type="submit" className="w-full">Save Log</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    