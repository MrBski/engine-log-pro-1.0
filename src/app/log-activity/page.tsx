
"use client";

import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { getInitialData, type ActivityLog, type EngineLog, type EngineReading, type LogSection } from "@/lib/data";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Trash2, History, FileJson, Archive, Eye, Share2, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useRef, useCallback, useState, useEffect } from "react";
import * as htmlToImage from 'html-to-image';

const sectionColors: { [key: string]: string } = {
    'M.E Port Side': 'bg-red-600',
    'M.E Starboard': 'bg-green-600',
    'Generator': 'bg-sky-600',
    'Daily Tank': 'bg-purple-600',
    'Flowmeter': 'bg-amber-600',
    'Others': 'bg-slate-500',
    'Fuel Consumption': 'bg-orange-600',
};

function LogEntryCard({ log, logbookSections }: { log: EngineLog, logbookSections: LogSection[] }) {
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    const handleShare = useCallback(async () => {
        if (!printRef.current) {
            return;
        }

        try {
            const dataUrl = await htmlToImage.toPng(printRef.current, {
                quality: 0.95,
                backgroundColor: 'hsl(var(--background))',
                 // Wait for images to load
                skipAutoScale: false,
                pixelRatio: 2
            });

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `engine-log-${log.id}.png`, { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Engine Log',
                    text: `Engine Log Entry for ${new Date(log.timestamp).toLocaleString()}`,
                });
            } else {
                 // Fallback for browsers that don't support sharing files
                const link = document.createElement('a');
                link.download = `engine-log-${log.id}.png`;
                link.href = dataUrl;
                link.click();
            }
        } catch (error) {
            console.error('oops, something went wrong!', error);
            toast({
                variant: 'destructive',
                title: 'Failed to Share',
                description: 'Could not generate or share the log image.'
            });
        }
    }, [log.id, log.timestamp, toast]);


    const getReadingsForSection = (title: string) => {
        return log.readings.filter(r => r.key.startsWith(title));
    }

    const sections = logbookSections.map(s => ({
        ...s,
        readings: getReadingsForSection(s.title)
    })).filter(s => s.readings.length > 0 && s.readings.some(r => r.value));

    const renderReading = (reading: EngineReading) => (
        <div key={reading.id} className="flex items-center border-b border-white/5 py-0.5">
            <label className="w-1/2 font-medium text-xs text-muted-foreground">
                {reading.key.replace(/.*? - /g, '')}
            </label>
            <div className="w-1/2 text-right font-mono text-xs font-semibold">
                {reading.value} <span className="text-muted-foreground/50">{reading.unit}</span>
            </div>
        </div>
    );
    
    const robReading = log.readings.find(r => r.id === 'other_rob');
    const used4HoursReading = log.readings.find(r => r.id === 'other_used');

    const robValue = robReading && robReading.value ? parseFloat(robReading.value) : 0;
    const used4HoursValue = used4HoursReading && used4HoursReading.value ? parseFloat(used4HoursReading.value) : 0;
    const hourlyConsumption = used4HoursValue > 0 ? used4HoursValue / 4 : 0;
    
    const robHour1 = robValue - hourlyConsumption;
    const robHour2 = robHour1 - hourlyConsumption;
    const robHour3 = robHour2 - hourlyConsumption;
    const robHour4 = robHour3 - hourlyConsumption;

    const hasConsumptionData = robReading && used4HoursReading && robValue > 0 && used4HoursValue > 0;

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Engine Log Preview</DialogTitle>
            </DialogHeader>
            <div className="max-h-[80vh] overflow-y-auto p-1">
                <div ref={printRef} className="space-y-1 bg-card p-1 rounded-lg text-sm">
                    <div className="font-bold text-center text-sm h-8 flex items-center justify-center bg-muted/50 rounded-md">
                        {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="grid md:grid-cols-2 gap-1">
                        {sections.map(section => (
                            <div key={section.title} className="space-y-0.5 p-1 border border-muted-foreground/50 rounded-sm">
                                <h3 className={cn("font-bold text-center p-1 my-1 rounded-md text-primary-foreground text-xs", sectionColors[section.title] || 'bg-gray-500')}>
                                    {section.title}
                                </h3>
                                {section.readings.map(renderReading)}
                            </div>
                        ))}
                         {hasConsumptionData && (
                            <div className="space-y-0.5 p-1 border border-muted-foreground/50 rounded-sm">
                                <h3 className={cn("font-bold text-center p-1 my-1 rounded-md text-primary-foreground text-xs", sectionColors['Fuel Consumption'] || 'bg-gray-500')}>
                                    USED / HOUR (-{hourlyConsumption.toFixed(2)} L/hr)
                                </h3>
                                <div className="flex items-center border-b border-white/5 py-0.5">
                                    <label className="w-1/2 font-medium text-xs text-muted-foreground">ROB Awal</label>
                                    <div className="w-1/2 text-right font-mono text-xs font-semibold">{robValue.toFixed(2)} <span className="text-muted-foreground/50">L</span></div>
                                </div>
                                <div className="flex items-center border-b border-white/5 py-0.5">
                                    <label className="w-1/2 font-medium text-xs text-muted-foreground">Jam ke-1</label>
                                    <div className="w-1/2 text-right font-mono text-xs font-semibold">{robHour1.toFixed(2)} <span className="text-muted-foreground/50">L</span></div>
                                </div>
                                <div className="flex items-center border-b border-white/5 py-0.5">
                                    <label className="w-1/2 font-medium text-xs text-muted-foreground">Jam ke-2</label>
                                    <div className="w-1/2 text-right font-mono text-xs font-semibold">{robHour2.toFixed(2)} <span className="text-muted-foreground/50">L</span></div>
                                </div>
                                <div className="flex items-center border-b border-white/5 py-0.5">
                                    <label className="w-1/2 font-medium text-xs text-muted-foreground">Jam ke-3</label>
                                    <div className="w-1/2 text-right font-mono text-xs font-semibold">{robHour3.toFixed(2)} <span className="text-muted-foreground/50">L</span></div>
                                </div>
                                <div className="flex items-center border-b border-white/5 py-0.5">
                                    <label className="w-1/2 font-bold text-xs text-foreground">Jam ke-4 (ROB Akhir)</label>
                                    <div className="w-1/2 text-right font-mono text-xs font-bold">{robHour4.toFixed(2)} <span className="text-muted-foreground/50">L</span></div>
                                sem</div>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-1 pt-1">
                         <div className="text-center space-y-0.5">
                            <div className="h-6 text-center font-semibold flex items-center justify-center rounded-md bg-accent text-accent-foreground text-sm">
                                {log.officer}
                            </div>
                        </div>
                        <div className="text-center font-bold p-2 rounded-md bg-muted min-h-[30px] flex items-center justify-center text-xs mt-1">
                           {log.notes}
                        </div>
                    </div>

                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                </Button>
                <DialogClose asChild>
                    <Button variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    )
}

export default function LogActivityPage() {
    const [activityLog, setActivityLog] = useLocalStorage<ActivityLog[]>('activityLog', getInitialData().activityLog);
    const [logs, setLogs] = useLocalStorage<EngineLog[]>('logs', getInitialData().logs);
    const [logbookSections] = useLocalStorage<LogSection[]>('logbookSections', getInitialData().logbookSections);
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleDeleteLog = (logId: string) => {
        const logToDelete = logs.find(log => log.id === logId);
        if (!logToDelete) return;
    
        // Also remove associated activity
        setActivityLog(prev => prev.filter(activity => activity.id !== logId));
        setLogs(prev => prev.filter(log => log.id !== logId));
        
        toast({ title: "Log Deleted", description: "The log entry has been removed." });
    };

    const sortedActivities = [...activityLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const categoryMapping: { [key: string]: string } = {
        'main-engine': 'Inventory (ME)',
        'generator': 'Inventory (AE)',
        'other': 'Inventory (Others)',
    };
    
    const getIcon = (type: ActivityLog['type']) => {
        switch (type) {
            case 'engine': return <FileJson className="h-4 w-4 text-muted-foreground" />;
            case 'inventory': return <Archive className="h-4 w-4 text-muted-foreground" />;
            case 'generator': return <Zap className="h-4 w-4 text-muted-foreground" />;
            default: return <History className="h-4 w-4 text-muted-foreground" />;
        }
    }

    const getActivityTitle = (activity: ActivityLog) => {
        switch (activity.type) {
            case 'engine': return 'Engine Log Entry';
            case 'inventory': return `"${activity.name}" updated`;
            case 'generator': return 'Generator Action';
            default: return 'Activity';
        }
    }

    const getOfficerText = (activity: ActivityLog) => {
        switch (activity.type) {
            case 'engine': return `by ${activity.officer}`;
            case 'inventory': return categoryMapping[activity.category || 'other'];
            case 'generator': return `by ${activity.officer}`;
            default: return '';
        }
    }

    const getNotes = (activity: ActivityLog) => {
         switch (activity.type) {
            case 'engine': return null;
            case 'inventory': return activity.notes;
            case 'generator': return activity.notes;
            default: return null;
        }
    }

    return (
        <>
        <AppHeader />
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <History className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Log Activity</h2>
            </div>

            <div className="space-y-2">
                {sortedActivities.map(activity => {
                    const notes = getNotes(activity);
                    return (
                        <Card key={activity.id} className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3">
                                {getIcon(activity.type)}
                                <div>
                                    <p className="font-semibold text-sm">
                                        {getActivityTitle(activity)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {isMounted ? new Date(activity.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short'}) : '...'} - {' '}
                                        <span className="font-medium">
                                            {getOfficerText(activity)}
                                        </span>
                                    </p>
                                    {notes && (
                                         <p className="text-xs text-muted-foreground">{notes}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                               {activity.type === 'engine' && (
                                <>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                        </DialogTrigger>
                                        {/* Find the full log from the logs array to pass to the card */}
                                        <LogEntryCard log={logs.find(l => l.id === activity.id) as EngineLog} logbookSections={logbookSections} />
                                    </Dialog>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the log entry.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteLog(activity.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                               )}
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
        </>
    )
}

    