'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

interface NavbarProps {
  toggleSidebar: () => void;
}

export default function Navbar({ toggleSidebar }: NavbarProps) {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  return (
    <header className="flex justify-between items-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 z-10">
      {/* Izquierda: hamburguesa + logo + nombre */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="text-gray-700 dark:text-gray-200 text-2xl leading-none focus:outline-none"
          aria-label="Abrir menú lateral"
        >
          ☰
        </button>

        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 relative flex-shrink-0">
            {!imgError ? (
              <Image
                src="/logo.png"
                alt={t('navbar.logoAlt') ?? 'Logo'}
                style={{ width: '80px', height: '80px' }}
                onError={() => setImgError(true)}
                
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                {/** Iniciales como fallback */}
                {process.env.NEXT_PUBLIC_APP_INITIALS ?? 'AP'}
              </div>
            )}
          </div>

          <span className="hidden sm:inline text-lg font-semibold text-gray-800 dark:text-white">
            {process.env.NEXT_PUBLIC_APP_NAME ?? 'Mi App'}
          </span>
        </Link>
      </div>

      {/* Derecha: controles */}
      <div className="flex items-center gap-3">
        <LanguageToggle />

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />

        <button
          onClick={() => {
            localStorage.removeItem('loggedIn');
            // Opcional: borrar token u otros items aquí
            window.location.href = '/login';
          }}
          className="px-3 py-2 rounded-md text-sm font-medium bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition-shadow shadow-sm"
          aria-label={t('navbar.logout') ?? 'Cerrar sesión'}
        >
          {t('navbar.logout') ?? 'Cerrar sesión'}
        </button>
      </div>
    </header>
  );
}
