import { Navbar } from '@/components/navbar';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import { Inter } from 'next/font/google';
import type React from 'react';
import './globals.css';
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'PandaMock - SaaS Tenant Management',
  description: 'Manage your PandaMock SaaS tenant and teams'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
