// Salin dan tempel kode ini ke src/app/log-activity/page.tsx Anda

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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import * as htmlToImage from 'html-to-image';
import { useData } from '@/hooks/use-data';

// Warna untuk Log Preview (Hanya untuk referensi, tidak berubah)
const sectionColors: { [key: string]: string } = {
    'M.E Port Side': 'bg-red-600',
    'M.E Starboard': 'bg-green-600',
    'Generator': 'bg-sky-600',
    'Daily Tank': 'bg-purple-600',
    'Flowmeter': 'bg-amber-600',
    'Others': 'bg-slate-500',
    'Fuel Consumption': 'bg-orange-600',
};

// --- HELPER SAFE DATE ---
const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000);
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

// --- KOMPONEN POPUP DETAIL LOG (tidak diubah, namun menerima logbookSections dengan aman) ---
function LogEntryCard({ log, logbookSections }: { log: EngineLog | undefined, logbookSections: LogSection[] }) {
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);
    const logTimestamp = safeToDate(log?.timestamp);

    const handleShare = useCallback(async () => {
        if (!printRef.current) return;
        try {
            const dataUrl = await htmlToImage.toPng(printRef.current, {
                quality: 0.95, backgroundColor: 'hsl(var(--background))', skipAutoScale: false, pixelRatio: 2
            });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `engine-log-${log?.id}.png`, { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Engine Log' });
            } else {
                const link = document.createElement('a');
                link.download = `engine-log-${log?.id}.png`;
                link.href = dataUrl;
                link.click();
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to Share' });
        }
    }, [log, logTimestamp, toast]);

    if (!log || logbookSections.length === 0) return null; // Safety check

    const getReadingsForSection = (title: string) => log.readings.filter(r => r.key.startsWith(title));
    const sections = (logbookSections || []).map(s => ({
        ...s, readings: getReadingsForSection(s.title)
    })).filter(s => s.readings.length > 0 && s.readings.some(r => r.value));

    const renderReading = (reading: EngineReading) => (
        <div key={reading.id} className="flex items-center border-b border-white/5 py-0.5">
            <label className="w-1/2 font-medium text-xs text-muted-foreground">{reading.key.replace(/.*? - /g, '')}</label>
            <div className="w-1/2 text-right font-mono text-xs font-semibold">{reading.value} <span className="text-muted-foreground/50">{reading.unit}</span></div>
        </div>
    );

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Engine Log Preview</DialogTitle></DialogHeader>
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
                    </div>
                    <div className="space-y-1 pt-1">
                        <div className="h-6 text-center font-semibold flex items-center justify-center rounded-md bg-accent text-accent-foreground text-sm">{log.officer}</div>
                        <div className="text-center font-bold p-2 rounded-md bg-muted min-h-[30px] flex items-center justify-center text-xs mt-1">{log.notes}</div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleShare}><Icons.share className="mr-2 h-4 w-4" />Share</Button>
                <DialogClose asChild><Button variant="secondary">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    )
}

// --- LOGIC JUDUL AKTIVITAS (MEMPERBAIKI MASALAH LEGACY DATA) ---
const getActivityTitle = (activity: ActivityLog) => {
    if (!activity) return 'Unknown Activity';
    
    // Safety: Memastikan type adalah string sebelum diolah
    const type = activity.type as string; 

    if (type === 'engine') return 'Engine Log Entry';
    if (type === 'inventory') return `"${activity.name}" updated`;
    
    // Menggabungkan logika untuk Generator dan Main Engine (M.E)
    if (type === 'generator' || type === 'main_engine') {
        // Menggunakan notes yang sudah disetel oleh toggle function
        return activity.notes || `${type === 'main_engine' ? 'Main Engine' : 'Generator'} Action`; 
    }
    
    // Termasuk 'main_engine (Legacy Data)' jika tipe tidak dikenali sebagai salah satu di atas
    return 'System Activity';
}

// --- HALAMAN UTAMA ---
export default function LogActivityPage() {
    const { activityLog, deleteLog, logs, logbookSections, activityLogLoading, logbookLoading, fetchMoreActivityLogs, hasMoreActivityLogs } = useData();
    const { toast } = useToast();
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const handleDeleteLog = async (logId: string) => {
        try {
            await deleteLog(logId);
            toast({ title: "Log Deleted", description: "Engine log and related activity removed." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete log." });
        }
    };

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        await fetchMoreActivityLogs();
        setIsLoadingMore(false);
    };

    // --- SAFETY FILTER & LOADING CHECK ---
    // Pastikan activityLog dan logbookSections ada sebelum diproses
    const safeActivities = (activityLog || []).filter(item => item && item.type && item.timestamp);
    const safeLogbookSections = logbookSections || [];


    const getIcon = (type: any) => {
        switch (type) {
            case 'engine': return <Icons.file className="h-4 w-4 text-muted-foreground" />;
            case 'inventory': return <Icons.archive className="h-4 w-4 text-muted-foreground" />;
            case 'generator': return <Icons.zap className="h-4 w-4 text-muted-foreground" />;
            case 'main_engine': return <Icons.zap className="h-4 w-4 text-muted-foreground" />; // Menggunakan ikon yang sama
            default: return <Icons.history className="h-4 w-4 text-muted-foreground" />;
        }
    }


    if (activityLogLoading || logbookLoading) {
         return (
             <>
                 <AppHeader />
                 <div className="space-y-2 p-4 pt-10 text-center text-muted-foreground">Loading activities...</div>
             </>
         );
    }
    
    return (
        <>
            <AppHeader />
            <div className="space-y-4">
                
                {safeActivities.length === 0 && (
                    <Card className="text-center p-10"><p className="text-muted-foreground">No activities.</p></Card>
                )}

                <div className="space-y-2">
                    {safeActivities.map(activity => {
                        // Safety: Kita hanya perlu ID log untuk mencari EngineLog yang terkait
                        const logId = activity.type === 'engine' ? activity.logId : undefined;
                        // logs sudah diurutkan desc, find() akan menemukan yang cocok
                        const associatedLog = logId ? logs.find(l => l.id === logId) : undefined;
                        
                        // Cek apakah ini adalah entri Engine Log yang dapat dilihat/dihapus
                        const isDeletableEngineLog = activity.type === 'engine' && associatedLog;

                        return (
                            <Card key={activity.id} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    {getIcon(activity.type)}
                                    <div>
                                        <p className="font-semibold text-sm">{getActivityTitle(activity)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatSafeDate(safeToDate(activity.timestamp), { dateStyle: 'short', timeStyle: 'short' })} - {activity.officer}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isDeletableEngineLog && (
                                        <>
                                            <Dialog>
                                                <DialogTrigger asChild><Button variant="ghost" size="icon"><Icons.eye className="h-4 w-4" /></Button></DialogTrigger>
                                                {/* Melewatkan logbookSections yang sudah dipastikan bukan null/undefined */}
                                                <LogEntryCard log={associatedLog} logbookSections={safeLogbookSections} />
                                            </Dialog>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Icons.trash className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus Engine Log DAN Activity Log terkait. Undoing is not possible.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteLog(logId!)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </>
                                    )}
                                </div>
                            </Card>
                        )
                    })}
                </div>

                {hasMoreActivityLogs && (
                    <Button variant="outline" className="w-full" onClick={handleLoadMore} disabled={isLoadingMore}>{isLoadingMore ? "Loading..." : "Muat Selanjutnya"}</Button>
                )}
            </div>
        </>
    )
}
