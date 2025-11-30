
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/app-layout';
import { DataProvider } from '@/hooks/use-data';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Engine Log Pro',
  description: 'Offline-first engine log and inventory management for maritime professionals.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png', // Menggunakan logo.png untuk apple-touch-icon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="application-name" content="Engine Log Pro" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Engine Log Pro" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0d1117" />
      </head>
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
