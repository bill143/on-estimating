import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ChatSidebar } from '@/components/ai/ChatSidebar';
import { KeyboardShortcuts } from '@/components/system/KeyboardShortcuts';
import { EchoOrb } from '@/components/echo/EchoOrb';
import { EchoPanel } from '@/components/echo/EchoPanel';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "NEXUS ON Estimating | O'Neill Contractors",
  description: 'AI-Powered Enterprise Construction Estimating Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-white dark:bg-gray-950`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ChatSidebar />
            <EchoOrb />
            <EchoPanel />
            <KeyboardShortcuts />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
