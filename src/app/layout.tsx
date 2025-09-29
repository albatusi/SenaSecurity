import '../styles/globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import FloatingThemeButton from '@/components/FloatingThemeButton';

export const metadata: Metadata = {
  title: 'AutoTrack AI',
  description: 'Sistema inteligente de gestión vehicular',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Ejecutar antes de la hidratación para evitar FOUC */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function() {
            try {
              var theme = localStorage.getItem('theme');
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {
              // Silencioso en navegadores restringidos
            }
          })();`}
        </Script>
      </head>

      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen transition-colors duration-300">
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <FloatingThemeButton />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
