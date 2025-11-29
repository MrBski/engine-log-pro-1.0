
"use client";

import { KeyboardEvent, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { getInitialData, type EngineLog, type AppSettings, type ActivityLog } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/app-header';
import { format } from 'date-fns';

const readingSchema = z.object({
  id: z.string().optional(),
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

export const initialSections: LogFormData['sections'] = [
    {
      title: 'M.E Port Side',
      readings: [
        { id: 'me_port_rpm', key: 'RPM', value: '', unit: 'rpm' },
        { id: 'me_port_lo_press', key: 'L.O. PRESS', value: '', unit: 'bar' },
        { id: 'me_port_exhaust1', key: 'Exhaust 1', value: '', unit: '°C' },
        { id: 'me_port_exhaust2', key: 'Exhaust 2', value: '', unit: '°C' },
        { id: 'me_port_radiator', key: 'Radiator', value: '', unit: '°C' },
        { id: 'me_port_sw_temp', key: 'SW Temp', value: '', unit: '°C' },
        { id: 'me_port_fw_in', key: 'F.W. COOLERS In', value: '', unit: '°C' },
        { id: 'me_port_fw_out', key: 'F.W. COOLERS Out', value: '', unit: '°C' },
        { id: 'me_port_lo_in', key: 'L.O. COOLERS In', value: '', unit: '°C' },
        { id: 'me_port_lo_out', key: 'L.O. COOLERS Out', value: '', unit: '°C' },
      ],
    },
    {
      title: 'M.E Starboard',
      readings: [
        { id: 'me_sb_rpm', key: 'RPM', value: '', unit: 'rpm' },
        { id: 'me_sb_lo_press', key: 'L.O. PRESS', value: '', unit: 'bar' },
        { id: 'me_sb_exhaust1', key: 'Exhaust 1', value: '', unit: '°C' },
        { id: 'me_sb_exhaust2', key: 'Exhaust 2', value: '', unit: '°C' },
        { id: 'me_sb_radiator', key: 'Radiator', value: '', unit: '°C' },
        { id: 'me_sb_sw_temp', key: 'SW Temp', value: '', unit: '°C' },
        { id: 'me_sb_fw_in', key: 'F.W. COOLERS In', value: '', unit: '°C' },
        { id: 'me_sb_fw_out', key: 'F.W. COOLERS Out', value: '', unit: '°C' },
        { id: 'me_sb_lo_in', key: 'L.O. COOLERS In', value: '', unit: '°C' },
        { id: 'me_sb_lo_out', key: 'L.O. COOLERS Out', value: '', unit: '°C' },
      ],
    },
    {
      title: 'Generator',
      readings: [
        { id: 'gen_lo_press', key: 'L.O. PRESS', value: '', unit: 'bar' },
        { id: 'gen_fw_temp', key: 'F.W. TEMP', value: '', unit: '°C' },
        { id: 'gen_volts', key: 'VOLTS', value: '', unit: 'V' },
        { id: 'gen_ampere', key: 'AMPERE', value: '', unit: 'A' },
      ],
    },
    {
        title: 'Flowmeter',
        readings: [
            { id: 'flow_before', key: 'Before', value: '', unit: 'L' },
            { id: 'flow_after', key: 'After', value: '', unit: 'L' },
        ],
    },
    {
      title: 'Daily Tank',
      readings: [
          { id: 'daily_before', key: 'Before', value: '', unit: 'cm' },
          { id: 'daily_after', key: 'After', value: '', unit: 'L' },
      ],
    },
    {
      title: 'Daily Tank Before On Duty',
      readings: [
        { id: 'onduty_before', key: 'Before', value: '', unit: 'cm' },
      ],
    },
    {
        title: 'Others',
        readings: [
            { id: 'other_rob', key: 'RoB', value: '', unit: 'L' },
            { id: 'other_used', key: 'USED 4 Hours', value: '', unit: 'L' },
        ]
    }
];

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
  const { toast } = useToast();

  const form = useForm<LogFormData>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      sections: initialSections,
      onDutyEngineer: settings.officers.length > 0 ? settings.officers[0] : '',
      dutyEngineerPosition: "Chief Engineer", // example default
      condition: ""
    },
  });

  const { fields: sectionFields } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  
  const watchedSections = form.watch("sections");

  useEffect(() => {
    const onDutySection = watchedSections.find(s => s.title === 'Daily Tank Before On Duty');
    const dailyTankSection = watchedSections.find(s => s.title === 'Daily Tank');
  
    const onDutyBeforeValue = onDutySection?.readings.find(r => r.key === 'Before')?.value;
    const dailyTankBeforeValue = dailyTankSection?.readings.find(r => r.key === 'Before')?.value;
  
    const othersSectionIndex = watchedSections.findIndex(s => s.title === 'Others');
    const used4HoursReadingIndex = watchedSections[othersSectionIndex]?.readings.findIndex(r => r.key === 'USED 4 Hours');
  
    if (othersSectionIndex !== -1 && used4HoursReadingIndex !== -1) {
      // Check if both values are non-empty strings before parsing
      if (onDutyBeforeValue && dailyTankBeforeValue) {
        const onDutyBefore = parseFloat(onDutyBeforeValue);
        const dailyTankBefore = parseFloat(dailyTankBeforeValue);
  
        // Check if both parsed values are valid numbers
        if (!isNaN(onDutyBefore) && !isNaN(dailyTankBefore)) {
          const used4Hours = ((onDutyBefore - dailyTankBefore) * 21) / 4;
          form.setValue(`sections.${othersSectionIndex}.readings.${used4HoursReadingIndex}.value`, used4Hours.toFixed(2), { shouldValidate: false });
        }
      } else {
        // If one or both inputs are empty, set the value to an empty string or 0.00
        const currentValue = form.getValues(`sections.${othersSectionIndex}.readings.${used4HoursReadingIndex}.value`);
        if (currentValue !== "") {
          form.setValue(`sections.${othersSectionIndex}.readings.${used4HoursReadingIndex}.value`, "", { shouldValidate: false });
        }
      }
    }
  }, [watchedSections, form]);


  function onSubmit(values: LogFormData) {
    const newLog: EngineLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date(values.timestamp).toISOString(),
      officer: values.onDutyEngineer,
      readings: values.sections.flatMap(s => 
        s.readings.map(r => ({
          id: `reading-${Date.now()}-${s.title}-${r.key}`,
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
        name: 'Engine Log Entry', // Added for consistency
        category: 'main-engine' // Added for consistency
    };
    setActivityLog(prev => [newActivity, ...prev]);

    toast({ title: "Success", description: "New engine log has been recorded." });
    form.reset({
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        sections: initialSections,
        onDutyEngineer: settings.officers.length > 0 ? settings.officers[0] : '',
        dutyEngineerPosition: "Chief Engineer",
        condition: ""
    });
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
  

  return (
    <div className="flex flex-col gap-6">
      <AppHeader />
      <Card>
        <CardHeader>
          <CardTitle className="text-center">New Engine Log Sheet</CardTitle>
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
                  {section.readings.map((reading, readingIndex) => (
                    <FormField
                      key={`${section.id}-${reading.id || readingIndex}`}
                      control={form.control}
                      name={`sections.${sectionIndex}.readings.${readingIndex}.value`}
                      render={({ field }) => (
                        <FormItem className="flex items-center">
                          <FormLabel className="w-1/2 text-sm font-medium">{reading.key}</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              inputMode="decimal"
                              className="h-8 bg-card-foreground/5 text-right text-sm"
                              readOnly={reading.key === 'USED 4 Hours'}
                              {...field}
                              onKeyDown={handleKeyDown}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
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
