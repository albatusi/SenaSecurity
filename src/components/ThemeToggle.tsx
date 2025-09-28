'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const { theme, actualTheme, toggleTheme, setTheme, mounted } = useTheme();
  const { t } = useLanguage();
  const [isAnimating, setIsAnimating] = useState(false);

  // evita animar al primer render después de la hidratación
  useEffect(() => {
    setIsAnimating(false);
  }, [theme]);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => setIsAnimating(false), 300);
  };

  // obtiene el siguiente tema en el ciclo
  const getNextTheme = () => {
    if (theme === 'light') return 'dark';
    if (theme === 'dark') return 'auto';
    return 'light';
  };

  // icono basado en el tema actual
  const getThemeIcon = () => {
    if (theme === 'auto') return '🌓'; // Auto
    return actualTheme === 'light' ? '☀️' : '🌙';
  };

  // texto descriptivo del tema
  const getThemeText = () => {
    if (theme === 'auto') return t('theme.auto') || 'Automático';
    return theme === 'light' ? (t('theme.light') || 'Modo claro') : (t('theme.dark') || 'Modo oscuro');
  };

  const content = mounted ? (
    <div className="flex items-center gap-3">
      {/* Botón principal con tema actual */}
      <div className="relative">
        <button
          onClick={handleToggle}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 hover:shadow-md ${
            theme === 'auto'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
              : actualTheme === 'dark'
                ? 'bg-slate-700 text-white shadow-slate-200 dark:shadow-slate-900'
                : 'bg-yellow-200 text-gray-800 shadow-yellow-200'
          } ${isAnimating ? 'scale-105' : 'scale-100'}`}
          aria-label={`Tema actual: ${getThemeText()}. Clic para cambiar a ${getNextTheme()}`}
          title={`Tema: ${getThemeText()}. Clic para alternar`}
        >
          <span className="text-lg">{getThemeIcon()}</span>
          <span className="text-sm font-medium hidden sm:inline">{getThemeText()}</span>
        </button>
      </div>

      {/* Indicadores rápidos de selección directa */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setTheme('light')}
          className={`p-1.5 rounded text-xs transition-all duration-200 ${
            theme === 'light'
              ? 'bg-yellow-400 text-gray-900 shadow-sm scale-105'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title={t('theme.light') || 'Modo claro'}
          aria-label={`Cambiar a ${t('theme.light') || 'Modo claro'}`}
        >
          ☀️
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`p-1.5 rounded text-xs transition-all duration-200 ${
            theme === 'dark'
              ? 'bg-slate-600 text-white shadow-sm scale-105'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title={t('theme.dark') || 'Modo oscuro'}
          aria-label={`Cambiar a ${t('theme.dark') || 'Modo oscuro'}`}
        >
          🌙
        </button>
        <button
          onClick={() => setTheme('auto')}
          className={`p-1.5 rounded text-xs transition-all duration-200 ${
            theme === 'auto'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm scale-105'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title={t('theme.auto') || 'Automático'}
          aria-label={`Cambiar a ${t('theme.auto') || 'Automático'}`}
        >
          🌓
        </button>
      </div>
    </div>
  ) : (
    // placeholder neutral mientras esperamos mounted -> evita mismatch
    <div className="flex items-center gap-3">
      <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg opacity-70 animate-pulse" />
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded opacity-70" />
        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded opacity-70" />
        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded opacity-70" />
      </div>
    </div>
  );

  return content;
}
