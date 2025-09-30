'use client';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

interface NavbarProps {
  toggleSidebar: () => void;
}

export default function Navbar({ toggleSidebar }: NavbarProps) {
  const { t } = useLanguage();

  return (
    <header className="flex justify-between items-center bg-white dark:bg-gray-800 shadow px-6 py-4 z-10">
      {/* Izquierda: Botón hamburguesa + Logo + Nombre */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-blue-700 dark:text-blue-400 text-2xl"
        >
          ☰
        </button>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Image
            src="/Logo.png" // pon aquí la ruta de tu logo
            alt="Logo"
            width={48}
            height={48}
            className="object-contain" // ⬅ logo más grande y proporcionado
          />
          {/* Nombre del proyecto */}
          <span className="text-xl font-bold text-gray-800 dark:text-white">
          </span>
        </div>
      </div>

      {/* Centro-Derecha: Controles de usuario */}
      <div className="flex items-center gap-4">
        {/* Toggle de idioma */}
        <LanguageToggle />

        {/* Divider visual */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

        {/* Botón Cerrar Sesión */}
        <button
          onClick={() => {
            localStorage.removeItem('loggedIn');
            window.location.href = '/login';
          }}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
        >
          {t('navbar.logout')}
        </button>
      </div>
    </header>
  );
}