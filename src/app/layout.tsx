import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter } from 'next/font/google';
import BottomNav from '@/components/bottom-nav';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'MarineLogix',
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
        <div className="flex flex-col min-h-screen">
          <main className="flex-1 p-4 lg:p-6 mb-16">{children}</main>
          <BottomNav />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
