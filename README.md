# Engine Log Pro

Selamat datang di **Engine Log Pro**, sebuah aplikasi logbook mesin dan manajemen inventaris yang dirancang khusus untuk para profesional maritim. Aplikasi ini dibangun dengan pendekatan **offline-first**, memastikannya tetap berfungsi penuh bahkan tanpa koneksi internet, dan secara otomatis menyinkronkan data saat kembali online.

Proyek ini dibangun menggunakan **Next.js**, **React**, **TypeScript**, dan **Tailwind CSS**, dengan komponen UI dari **ShadCN**.

## Fitur Utama

-   **Dashboard Utama**: Memberikan gambaran umum sekilas tentang metrik-metrik penting, termasuk:
    -   Total Jam Jalan Mesin Utama (M.E. Running Hours).
    -   Total Jam Jalan Generator (Generator RHS) dengan kontrol Start/Stop.
    -   Informasi konsumsi bahan bakar terakhir.
    -   Peringatan untuk item inventaris yang stoknya menipis.
    -   Grafik performa mesin dari waktu ke waktu.

-   **Logbook Digital (`Input Data`)**: Formulir intuitif untuk mencatat data operasional mesin secara periodik.
    -   Struktur logbook yang dapat dikonfigurasi sepenuhnya melalui halaman Pengaturan.
    -   Input yang dioptimalkan untuk perangkat mobile dengan navigasi mudah menggunakan tombol 'Enter'.
    -   Perhitungan otomatis untuk beberapa field, seperti konsumsi bahan bakar.

-   **Manajemen Inventaris (`Inventory`)**: Melacak semua suku cadang dan persediaan.
    -   Menambah item baru dengan kategori (Mesin Utama, Generator, Lainnya).
    -   Mencatat pemakaian item, yang secara otomatis mengurangi stok.
    -   Badge visual untuk menandai item dengan stok rendah.

-   **Log Aktivitas Terpusat (`Log Activity`)**: Catatan kronologis dari semua aktivitas penting yang terjadi di aplikasi.
    -   Mencatat setiap entri log mesin baru.
    -   Mencatat penambahan dan penggunaan item inventaris.
    -   Melacak siapa yang menyalakan, mematikan, dan mereset jam jalan generator.
    -   Pratinjau detail untuk setiap entri log mesin.

-   **Pengaturan (`Settings`)**: Halaman untuk mengustomisasi aplikasi sesuai kebutuhan operasional.
    -   Mengubah Nama Kapal dan informasi umum lainnya.
    -   Menambah atau menghapus daftar perwira (officer).
    -   **Kustomisasi Logbook**: Antarmuka untuk menambah, menghapus, atau mengubah nama seksi dan isian data pada lembar logbook.

-   **Autentikasi Aman & Persisten**:
    -   Sistem login berbasis kredensial untuk menjaga keamanan data.
    -   Sesi login disimpan secara lokal (`localStorage`), sehingga pengguna hanya perlu login sekali dan tetap masuk sampai logout manual.

-   **Arsitektur Offline-First**:
    -   Dirancang untuk berfungsi penuh tanpa koneksi internet.
    -   Indikator status koneksi (Online/Offline/Syncing) yang jelas di header.
    -   Fondasi telah disiapkan untuk integrasi dengan **Firebase Firestore** untuk sinkronisasi data otomatis antar 6 pengguna yang ditentukan saat terhubung ke internet.

## Persiapan Backend

Aplikasi ini telah dirancang untuk berintegrasi dengan **Firebase** untuk penyimpanan data cloud dan sinkronisasi real-time. Semua manajemen data di sisi klien telah dipusatkan melalui React Context (`DataProvider`), yang akan mempermudah transisi ke hook Firebase seperti `useCollection` dan `useDoc` untuk mengaktifkan sinkronisasi data offline.
