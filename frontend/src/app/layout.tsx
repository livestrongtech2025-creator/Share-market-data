import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'NSE Market Analytics | AI-Powered Platform',
  description: 'AI-Powered NSE India Market Data Automation & Analytics Platform',
  icons: { icon: '/favicon.ico' },
};

// Inline script: applies stored theme before paint to prevent FOUC flash.
const themeInitScript = `
(function () {
  try {
    var stored = JSON.parse(localStorage.getItem('nse-auth') || 'null');
    var theme = stored && stored.state && stored.state.theme;
    if (theme !== 'light') document.documentElement.classList.add('dark');
  } catch (_) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
