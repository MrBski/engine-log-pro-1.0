"use client";

import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { getInitialData, type EngineLog } from "@/lib/data";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function LogActivityPage() {
    const [logs, setLogs] = useLocalStorage<EngineLog[]>('logs', getInitialData().logs);
    const { toast } = useToast();

    const handleDeleteLog = (logId: string) => {
        setLogs(logs.filter(log => log.id !== logId));
        toast({ title: "Log Deleted", description: "The log entry has been removed." });
    };
    
    const getReading = (log: EngineLog, key: string) => {
        const reading = log.readings.find(r => r.key.toLowerCase().includes(key.toLowerCase()));
        return reading ? `${reading.value} ${reading.unit}` : '-';
    }

    return (
        <div className="flex flex-col gap-6">
            <AppHeader />
            <Card>
                <CardHeader>
                    <CardTitle>Log Activity</CardTitle>
                    <CardDescription>Review and manage all past log entries.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Officer</TableHead>
                                <TableHead>Port RPM</TableHead>
                                <TableHead>Stbd RPM</TableHead>
                                <TableHead className="max-w-[200px]">Notes</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => (
                            <TableRow key={log.id}>
                                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{log.officer}</TableCell>
                                <TableCell>{getReading(log, 'port side - rpm')}</TableCell>
                                <TableCell>{getReading(log, 'starboard - rpm')}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{log.notes}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleDeleteLog(log.id)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
