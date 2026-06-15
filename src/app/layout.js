import { Fraunces, DM_Sans } from 'next/font/google';
import './globals.css';
import { ConfirmProvider } from '@/components/ConfirmModal';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: 'Deadliner — Personal Project OS',
  description: 'A personal project operating system for solo creators',
  other: {
    'theme-color': '#D4815B',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4815B" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let isDark = localStorage.getItem('projectory_dark_mode') === 'true';
                if (!('projectory_dark_mode' in localStorage)) {
                  isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
                if (isDark) {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        <GlobalErrorBoundary>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </GlobalErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var _rp = localStorage.getItem('projectory_restore_path');
                if (_rp && _rp !== location.pathname + location.search) {
                  localStorage.removeItem('projectory_restore_path');
                  history.replaceState(null, '', _rp);
                }
              } catch(_){}
            `,
          }}
        />
      </body>
    </html>
  );
}
