import type { Metadata, Viewport } from 'next';
import { QueryProvider } from '@/providers/QueryProvider';
import { TelegramProvider } from '@/providers/TelegramProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'SerkoGram',
  description: 'Персональный архив сообщений Telegram',
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
      </head>
      <body className="bg-sg-bg text-sg-text-primary min-h-screen antialiased safe-top safe-bottom">
        <QueryProvider>
          <TelegramProvider>
            <main className="mx-auto max-w-lg min-h-screen">
              {children}
            </main>
          </TelegramProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
