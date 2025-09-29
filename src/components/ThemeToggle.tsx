'use client';
import React, { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Tipo parcial seguro del hook de theme.
 * Ajusta aquí si tu ThemeContext exporta nombres distintos.
 */
type PartialThemeHook = {
  theme?: 'light' | 'dark' | 'auto' | string | null;
  actualTheme?: 'light' | 'dark' | string | null;
  resolvedTheme?: 'light' | 'dark' | string | null;
  toggleTheme?: () => void;
  setTheme?: (v: 'light' | 'dark' | 'auto' | string) => void;
  mounted?: boolean;
};

export default function ThemeToggle(): React.ReactElement | null {
  const { t } = useLanguage();

  // Leemos el hook como parcial para evitar suposiciones sobre su forma exacta
  const themeHook = useTheme() as PartialThemeHook;

  // Extraemos valores con comprobaciones seguras
  const theme = themeHook?.theme ?? null;
  const actualTheme = themeHook?.actualTheme ?? themeHook?.resolvedTheme ?? null;
  const toggleThemeFn = typeof themeHook?.toggleTheme === 'function' ? themeHook.toggleTheme : undefined;
  const setThemeFn = typeof themeHook?.setTheme === 'function' ? themeHook.setTheme : undefined;
  const mounted = typeof themeHook?.mounted === 'boolean' ? themeHook.mounted : true;

  const [isAnimating, setIsAnimating] = useState(false);

  // evita animar al primer render después de la hidratación
  useEffect(() => {
    setIsAnimating(false);
  }, [theme]);

  const handleToggle = () => {
    setIsAnimating(true);
    if (toggleThemeFn) {
      toggleThemeFn();
    } else if (setThemeFn) {
      // fallback si solo existe setTheme: ciclo light -> dark -> auto -> light
      const cur = theme ?? actualTheme ?? 'auto';
      if (cur === 'light') setThemeFn('dark');
      else if (cur === 'dark') setThemeFn('auto');
      else setThemeFn('light');
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  const getNextTheme = () => {
    if (theme === 'light') return 'dark';
    if (theme === 'dark') return 'auto';
    return 'light';
  };

  const getThemeIcon = () => {
    if (theme === 'auto') return '🌓';
    // if actualTheme unknown fallback to light
    return actualTheme === 'light' ? '☀️' : '🌙';
  };

  const getThemeText = () => {
    if (theme === 'auto') return t('theme.auto') || 'Automático';
    return theme === 'light' ? (t('theme.light') || 'Modo claro') : (t('theme.dark') || 'Modo oscuro');
  };

  // Si el provider no ha marcado mounted, mostramos placeholder para evitar mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg opacity-70 animate-pulse" />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded opacity-70" />
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded opacity-70" />
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded opacity-70" />
        </div>
      </div>
    );
  }

  return (
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
          type="button"
        >
          <span className="text-lg">{getThemeIcon()}</span>
          <span className="text-sm font-medium hidden sm:inline">{getThemeText()}</span>
        </button>
      </div>

      {/* Indicadores rápidos de selección directa */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setThemeFn?.('light')}
          className={`p-1.5 rounded text-xs transition-all duration-200 ${
            theme === 'light'
              ? 'bg-yellow-400 text-gray-900 shadow-sm scale-105'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title={t('theme.light') || 'Modo claro'}
          aria-label={`Cambiar a ${t('theme.light') || 'Modo claro'}`}
          type="button"
        >
          ☀️
        </button>

        <button
          onClick={() => setThemeFn?.('dark')}
          className={`p-1.5 rounded text-xs transition-all duration-200 ${
            theme === 'dark'
              ? 'bg-slate-600 text-white shadow-sm scale-105'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title={t('theme.dark') || 'Modo oscuro'}
          aria-label={`Cambiar a ${t('theme.dark') || 'Modo oscuro'}`}
          type="button"
        >
          🌙
        </button>

        <button
          onClick={() => setThemeFn?.('auto')}
          className={`p-1.5 rounded text-xs transition-all duration-200 ${
            theme === 'auto'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm scale-105'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title={t('theme.auto') || 'Automático'}
          aria-label={`Cambiar a ${t('theme.auto') || 'Automático'}`}
          type="button"
        >
          🌓
        </button>
      </div>
    </div>
  );
}
