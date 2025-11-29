"use client";

import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { getInitialData, type ActivityLog, type EngineLog } from "@/lib/data";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, Trash2, History, FileJson, Archive, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";

function LogEntryCard({ log }: { log: EngineLog }) {
    const getReading = (key: string) => {
        const reading = log.readings.find(r => r.key.toLowerCase().includes(key.toLowerCase()));
        return reading ? `${reading.value} ${reading.unit}` : '-';
    }

    return (
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Engine Log Details</DialogTitle>
                <DialogDescription>
                    Recorded by {log.officer} on {new Date(log.timestamp).toLocaleString()}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm py-4">
                {log.readings.map(reading => (
                    <div key={reading.id} className="flex justify-between">
                        <span className="text-muted-foreground">{reading.key.replace('M.E Port Side - ', '').replace('M.E Starboard - ', '').replace('Generator - ', '')}</span>
                        <span className="font-medium">{reading.value} {reading.unit}</span>
                    </div>
                ))}
                <div className="pt-2">
                    <p className="font-medium">Notes:</p>
                    <p className="text-muted-foreground">{log.notes}</p>
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
    const [selectedLog, setSelectedLog] = useState<EngineLog | null>(null);

    const handleDeleteLog = (logId: string) => {
        setLogs(prev => prev.filter(log => log.id !== logId));
        setActivityLog(prev => prev.filter(log => log.id !== logId));
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
                            </div>
                        </div>

                        {activity.type === 'engine' && (
                             <div className="flex items-center gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                    </DialogTrigger>
                                    <LogEntryCard log={activity} />
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
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
        </>
    )
}
