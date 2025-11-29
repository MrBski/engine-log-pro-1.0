"use client";

import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { getInitialData, type ActivityLog, type EngineLog, type EngineReading } from "@/lib/data";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Trash2, History, FileJson, Archive, Eye } from "lucide-react";
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
import { initialSections } from "@/app/logbook/page";
import { cn } from "@/lib/utils";

const sectionColors: { [key: string]: string } = {
    'M.E Port Side': 'bg-red-600',
    'M.E Starboard': 'bg-green-600',
    'Generator': 'bg-sky-600',
    'Daily Tank': 'bg-purple-600',
    'Flowmeter': 'bg-amber-600',
    'Others': 'bg-slate-500'
};

function LogEntryCard({ log }: { log: EngineLog }) {

    const getReadingsForSection = (title: string) => {
        return log.readings.filter(r => r.key.startsWith(title));
    }

    const sections = initialSections.map(s => ({
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

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Engine Log Preview</DialogTitle>
            </DialogHeader>
            <div className="max-h-[80vh] overflow-y-auto">
                <div className="space-y-2 bg-card p-2 rounded-lg text-sm">
                    <div className="font-bold text-center text-base h-8 flex items-center justify-center bg-muted/50 rounded-md">
                        {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                        {sections.map(section => (
                            <div key={section.title} className="space-y-1 p-1 border border-muted-foreground/50 rounded-sm">
                                <h3 className={cn("font-bold text-center p-1.5 my-2 rounded-md text-primary-foreground text-xs", sectionColors[section.title] || 'bg-gray-500')}>
                                    {section.title}
                                </h3>
                                {section.readings.map(renderReading)}
                            </div>
                        ))}
                    </div>
                    
                    <div className="space-y-1 pt-2">
                         <div className="text-center space-y-0.5">
                            <div className="h-6 text-center font-semibold flex items-center justify-center rounded-md bg-accent text-accent-foreground">
                                {log.officer}
                            </div>
                        </div>
                        <div className="text-center font-bold p-2 rounded-md bg-muted min-h-[40px] flex items-center justify-center text-sm mt-2">
                           {log.notes}
                        </div>
                    </div>

                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    )
}

export default function LogActivityPage() {
    const [activityLog, setActivityLog] = useLocalStorage<ActivityLog[]>('activityLog', getInitialData().activityLog);
    const [logs, setLogs] = useLocalStorage<EngineLog[]>('logs', getInitialData().logs);
    const { toast } = useToast();

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

    return (
        <>
        <AppHeader />
        <div className="space-y-8">
            <div className="flex items-center gap-2">
                <History className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Log Activity</h2>
            </div>

            <div className="space-y-4">
                {sortedActivities.map(activity => (
                    <Card key={activity.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            {activity.type === 'engine' ? (
                                <FileJson className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Archive className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                                <p className="font-semibold">
                                    {activity.type === 'engine' ? 'Engine Log Entry' : `"${activity.name}" updated`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(activity.timestamp).toLocaleString()} - {' '}
                                    <span className="font-medium">
                                        {activity.type === 'engine' ? `by ${activity.officer}` : categoryMapping[activity.category || 'other']}
                                    </span>
                                </p>
                                {activity.type === 'inventory' && (
                                     <p className="text-xs text-muted-foreground">{activity.notes}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                           {activity.type === 'engine' && (
                            <>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                    </DialogTrigger>
                                    {/* Find the full log from the logs array to pass to the card */}
                                    <LogEntryCard log={logs.find(l => l.id === activity.id) as EngineLog} />
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
                ))}
            </div>
        </div>
        </>
    )
}
