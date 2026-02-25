import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Starfield from '@/components/Starfield';
import CursorTrail from '@/components/CursorTrail';
import HeartsOnClick from '@/components/HeartsOnClick';
import { ToastProvider } from '@/components/Toast';
import { BillProvider } from '@/components/Bill';

export const dynamic = 'force-dynamic';

const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

export const metadata: Metadata = {
  title: 'Teacher Vault',
  description: 'AI-Powered Teaching Resource Library',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1"
          as="style"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1"
          rel="stylesheet"
        />
      </head>
      <body className={mono.className}>
        <AuthProvider>
          <BillProvider>
            <ToastProvider>
              <Starfield />
              <CursorTrail />
              <HeartsOnClick />
              <div style={{ position: 'relative', zIndex: 1 }}>
                {children}
              </div>
            </ToastProvider>
          </BillProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
