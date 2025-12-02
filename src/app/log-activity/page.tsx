// DI DALAM LogActivityPage.tsx (Hanya ganti fungsi ini)

const getActivityTitle = (activity: ActivityLog) => {
    // Fallback safe
    if (!activity) return 'Unknown Activity';
    
    // Handling tipe sisa ('main_engine') tanpa error
    const type = activity.type as string; 

    if (type === 'engine') return 'Engine Log Entry';
    if (type === 'inventory') return `"${activity.name}" updated`;
    
    // === PERUBAHAN DI SINI ===
    // Sekarang mengenali type 'generator' DAN type 'main_engine'
    if (type === 'generator' || type === 'main_engine') {
        // Mengambil notes yang sudah disetel oleh handleMainEngineToggle/handleGeneratorToggle
        return activity.notes || `${type === 'main_engine' ? 'Main Engine' : 'Generator'} Action`; 
    }
    // === AKHIR PERUBAHAN ===
    
    return 'System Activity';
}

// Catatan: Baris "if (type === 'main_engine') return 'Main Engine (Legacy Data)';" sudah Dihapus/Digantikan
