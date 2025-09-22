'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LanguageProvider } from '@/contexts/LanguageContext';
// Elimina la importación de ThemeProvider
// import { ThemeProvider } from '@/contexts/ThemeContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // Elimina ThemeProvider aquí, ya está en el layout global
    <LanguageProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Contenedor principal en columna */}
        <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 ml-0">
          {/* Navbar */}
          <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          {/* Contenido crece */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {children}
          </main>

          {/* Footer al final */}
          <Footer />
        </div>
      </div>
    </LanguageProvider>
  );
}