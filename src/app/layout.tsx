// app/layout.tsx  (o src/app/layout.tsx)
import '../styles/globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

export const metadata: Metadata = {
  title: 'AutoTrack AI',
  description: 'Sistema inteligente de gestión vehicular',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Script que aplica clase 'dark' *antes* de la hidratación cliente */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark') document.documentElement.classList.add('dark');
                else if (t === 'light') document.documentElement.classList.remove('dark');
                // si no hay valor, no tocamos nada (CSS puede usar prefers-color-scheme)
              } catch (e) { /* noop */ }
            })();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
