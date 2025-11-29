
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/app-layout';
import { DataProvider } from '@/hooks/use-data';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Engine log pro',
  description: 'Offline-first engine log and inventory management for maritime professionals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head />
      <body className={`font-sans antialiased ${inter.variable}`}>
        <AuthProvider>
          <DataProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </DataProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
