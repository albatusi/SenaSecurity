'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    
    // Resetear animación después de completarse
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Etiqueta de modo claro */}
      <span 
        className={`text-sm font-medium transition-all duration-300 cursor-pointer select-none ${
          theme === 'light' 
            ? 'text-yellow-600 dark:text-yellow-400 scale-110' 
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        onClick={() => theme !== 'light' && toggleTheme()}
        title={t('theme.light')}
      >
        ☀️
      </span>

      {/* Toggle Switch */}
      <div className="relative">
        <button
          onClick={handleToggle}
          className={`relative w-14 h-7 rounded-full p-1 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 hover:shadow-lg ${
            theme === 'dark' 
              ? 'bg-slate-700 shadow-slate-200 dark:shadow-slate-900' 
              : 'bg-yellow-200 shadow-yellow-200'
          } ${isAnimating ? 'scale-105' : 'scale-100'}`}
          aria-label={`${t('theme.toggleTo')} ${theme === 'light' ? t('theme.dark') : t('theme.light')}`}
          title={`${t('theme.toggleTo')} ${theme === 'light' ? t('theme.dark') : t('theme.light')}`}
        >
          {/* Círculo deslizante con icono */}
          <div
            className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center ${
              theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
            } ${isAnimating ? 'scale-110' : 'scale-100'}`}
          >
            {/* Icono dentro del círculo */}
            <span className="text-xs">
              {theme === 'light' ? '☀️' : '🌙'}
            </span>
          </div>
          
          {/* Fondo con gradiente sutil */}
          <div className="absolute inset-0 rounded-full pointer-events-none">
            <div className={`w-full h-full rounded-full transition-opacity duration-300 ${
              theme === 'dark' 
                ? 'bg-gradient-to-r from-slate-600 to-slate-800 opacity-50' 
                : 'bg-gradient-to-r from-yellow-100 to-yellow-300 opacity-30'
            }`} />
          </div>
        </button>
      </div>

      {/* Etiqueta de modo oscuro */}
      <span 
        className={`text-sm font-medium transition-all duration-300 cursor-pointer select-none ${
          theme === 'dark' 
            ? 'text-slate-300 dark:text-slate-200 scale-110' 
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        onClick={() => theme !== 'dark' && toggleTheme()}
        title={t('theme.dark')}
      >
        🌙
      </span>
    </div>
  );
}
