
"use client";

import { useState, useCallback, useRef } from "react";
import { type ActivityLog, type EngineLog, type EngineReading, type LogSection } from "@/lib/data";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
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
import * as htmlToImage from 'html-to-image';
import { useData } from "@/hooks/use-data";


const sectionColors: { [key: string]: string } = {
    'M.E Port Side': 'bg-red-600',
    'M.E Starboard': 'bg-green-600',
    'Generator': 'bg-sky-600',
    'Daily Tank': 'bg-purple-600',
    'Flowmeter': 'bg-amber-600',
    'Others': 'bg-slate-500',
    'Fuel Consumption': 'bg-orange-600',
};

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    // Firestore Timestamps are converted in useData, so we primarily handle strings from localStorage
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return null;
};

const formatSafeDate = (date: Date | null, options: Intl.DateTimeFormatOptions = {}): string => {
    if (!date) return '...';
    try {
        return date.toLocaleString('id-ID', options);
    } catch {
        return 'Invalid Date';
    }
}

function LogEntryCard({ log, logbookSections }: { log: EngineLog | undefined, logbookSections: LogSection[] }) {
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    const logTimestamp = safeToDate(log?.timestamp);

    const handleShare = useCallback(async () => {
        if (!printRef.current) {
            return;
        }

        try {
            const dataUrl = await htmlToImage.toPng(printRef.current, {
                quality: 0.95,
                backgroundColor: 'hsl(var(--background))',
                skipAutoScale: false,
                pixelRatio: 2
            });

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `engine-log-${log?.id}.png`, { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Engine Log',
                    text: `Engine Log Entry for ${formatSafeDate(logTimestamp)}`,
                });
            } else {
                const link = document.createElement('a');
                link.download = `engine-log-${log?.id}.png`;
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
    }, [log, logTimestamp, toast]);

    if (!log) {
        return (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Not Found</DialogTitle>
                </DialogHeader>
                <p>Log data not found or is still syncing. Please try again in a moment.</p>
                <DialogFooter>
                    <DialogClose asChild><Button variant="secondary">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        )
    }

    const getReadingsForSection = (title: string) => {
        return log.readings.filter(r => r.key.startsWith(title));
    }

    const sections = (logbookSections || []).map(s => ({
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
    const hourlyConsumption = used4HoursValue > 0 ? Math.round(used4HoursValue / 4) : 0;

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
                        {formatSafeDate(logTimestamp, { dateStyle: 'full', timeStyle: 'short' })}
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
                                <div className="flex items-center border-b border-white/5 py.0.5">
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
                                </div>
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
                    <Icons.share className="mr-2 h-4 w-4" />
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
    const { activityLog, deleteLog, logs, logbookSections, activityLogLoading, logbookLoading } = useData();
    const { toast } = useToast();

    const handleDeleteLog = async (logId: string) => {
        try {
            await deleteLog(logId);
            toast({ title: "Log Deleted", description: "The log entry has been removed." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete log." });
        }
    };

    // The data is already sorted by timestamp desc from useData hook.
    const sortedActivities = activityLog;

    const getIcon = (type: ActivityLog['type']) => {
        switch (type) {
            case 'engine': return <Icons.file className="h-4 w-4 text-muted-foreground" />;
            case 'inventory': return <Icons.archive className="h-4 w-4 text-muted-foreground" />;
            case 'generator': return <Icons.zap className="h-4 w-4 text-muted-foreground" />;
            default: return <Icons.history className="h-4 w-4 text-muted-foreground" />;
        }
    }

    const getActivityTitle = (activity: ActivityLog) => {
        switch (activity.type) {
            case 'engine': return 'Engine Log Entry';
            case 'inventory': return `"${activity.name}" updated`;
            case 'generator': return activity.notes || 'Generator Action';
            default: return 'Activity';
        }
    }

    return (
        <>
            <AppHeader />
            <div className="space-y-4">
                {(activityLogLoading || logbookLoading) && (
                    <div className="space-y-2">
                        <Card className="p-3 h-[74px] animate-pulse" />
                        <Card className="p-3 h-[74px] animate-pulse" />
                        <Card className="p-3 h-[74px] animate-pulse" />
                    </div>
                )}
                
                {!(activityLogLoading || logbookLoading) && sortedActivities.length === 0 && (
                    <Card className="text-center p-10">
                        <p className="text-muted-foreground">No activities recorded yet.</p>
                    </Card>
                )}

                <div className="space-y-2">
                    {sortedActivities.map(activity => {
                        const logId = activity.type === 'engine' ? activity.logId : undefined;
                        const associatedLog = logId ? logs.find(l => l.id === logId) : undefined;

                        return (
                            <Card key={activity.id} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    {getIcon(activity.type)}
                                    <div>
                                        <p className="font-semibold text-sm">
                                            {getActivityTitle(activity)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatSafeDate(safeToDate(activity.timestamp), { dateStyle: 'short', timeStyle: 'short' })} - {' '}
                                            <span className="font-medium">
                                                by {activity.officer}
                                            </span>
                                        </p>
                                        {activity.type === 'inventory' && activity.notes && (
                                            <p className="text-xs text-muted-foreground">{activity.notes}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {activity.type === 'engine' && logId && associatedLog && (
                                        <>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Icons.eye className="h-4 w-4" /></Button>
                                                </DialogTrigger>
                                                <LogEntryCard log={associatedLog} logbookSections={logbookSections as LogSection[]} />
                                            </Dialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                        <Icons.trash className="h-4 w-4" />
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
                                                        <AlertDialogAction onClick={() => handleDeleteLog(logId)}>Delete</AlertDialogAction>
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

    