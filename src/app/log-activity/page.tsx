// --- FUNGSI LogEntryCard di src/app/log-activity/page.tsx ---

function LogEntryCard({ log, logbookSections }: { log: EngineLog | undefined, logbookSections: LogSection[] }) {
    // ... kode yang sudah ada ...

    if (!log || logbookSections.length === 0) return null; 
    
    // --- LOGIC PERHITUNGAN USED/HOUR DAN ROB (DIKEMBALIKAN) ---
    
    // 1. Ambil data mentah
    const robReading = log.readings.find(r => r.key.includes('RoB'));
    const used4HoursReading = log.readings.find(r => r.key.includes('USED 4 Hours'));
    
    const robAwal = parseFloat(robReading?.value || '0');
    const used4Hours = parseFloat(used4HoursReading?.value || '0');
    
    let usedPerHour = 0;
    let robAkhirJam = [] as { jam: number, rob: number, usedPerHour: number }[];
    
    if (robAwal > 0 && used4Hours > 0) {
        usedPerHour = used4Hours / 4; // L/hr
        let currentRob = robAwal;
        
        // Hitung sisa ROB per jam
        for (let i = 1; i <= 4; i++) {
            currentRob -= usedPerHour;
            robAkhirJam.push({
                jam: i,
                rob: parseFloat(currentRob.toFixed(2)), // Pembulatan 2 desimal
                usedPerHour: parseFloat(usedPerHour.toFixed(2))
            });
        }
    }
    
    const usedPerHourDisplay = usedPerHour > 0 ? `${(usedPerHour * -1).toFixed(2)} L/hr` : 'N/A';
    // --- AKHIR LOGIC PERHITUNGAN ---


    // ... kode yang sudah ada untuk sections dan renderReading ...

    return (
        <DialogContent className="max-w-3xl">
            {/* ... DialogHeader ... */}
            <div className="max-h-[80vh] overflow-y-auto p-1">
                <div ref={printRef} className="space-y-1 bg-card p-1 rounded-lg text-sm">
                    {/* ... Timestamp dan Grid Section Readings ... */}
                    
                    {/* --- KARTU PERHITUNGAN USED PER HOUR --- */}
                    {usedPerHour > 0 && (
                        <div className="space-y-0.5 p-1 border border-muted-foreground/50 rounded-sm">
                            <h3 className={cn("font-bold text-center p-1 my-1 rounded-md text-primary-foreground text-xs", sectionColors['Fuel Consumption'] || 'bg-orange-600')}>
                                USED / HOUR ({usedPerHourDisplay})
                            </h3>
                            <div className="flex items-center border-b border-white/5 py-0.5">
                                <label className="w-1/2 font-medium text-xs text-muted-foreground">ROB Awal</label>
                                <div className="w-1/2 text-right font-mono text-xs font-semibold">{robAwal.toFixed(2)} <span className="text-muted-foreground/50">L</span></div>
                            </div>
                            {robAkhirJam.map((item, index) => (
                                <div key={index} className="flex items-center border-b border-white/5 py-0.5">
                                    <label className="w-1/2 font-medium text-xs text-muted-foreground">Jam ke-{item.jam} (ROB Akhir)</label>
                                    <div className="w-1/2 text-right font-mono text-xs font-semibold">{item.rob.toFixed(2)} <span className="text-muted-foreground/50">L</span></div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* ... Officer dan Notes ... */}
                </div>
            </div>
            {/* ... DialogFooter ... */}
        </DialogContent>
    )
}
