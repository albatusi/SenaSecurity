// app/layout.tsx  (o src/app/layout.tsx)
import '../styles/globals.css';
import type { Metadata } from 'next';
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
        {/* Script que aplica la clase 'dark' antes de la hidratación cliente.
            - Respeta localStorage.theme = 'dark' | 'light' | 'auto'
            - Si 'auto' o no hay valor, respeta prefers-color-scheme
            - Establece data-theme además de la clase para compatibilidad */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
  try {
    var userPref = null;
    try {
      userPref = localStorage.getItem('theme'); // 'dark' | 'light' | 'auto' | null
    } catch (e) {
      userPref = null;
    }

    var prefersDark = false;
    try {
      prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      prefersDark = false;
    }

    var useDark = false;

    if (userPref === 'dark') {
      useDark = true;
    } else if (userPref === 'light') {
      useDark = false;
    } else {
      // userPref is 'auto' or null -> follow system preference
      useDark = prefersDark;
    }

    // Apply class expected by Tailwind's dark mode
    if (useDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {
    // fail silently - don't break rendering
  }
})();`,
          }}
        />
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
