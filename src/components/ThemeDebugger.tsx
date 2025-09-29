'use client';
import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FaSun, FaMoon, FaAdjust } from 'react-icons/fa';

/**
 * Tipo parcial seguro: lista solo las propiedades que usamos en este componente.
 * Evita el uso de `any` y previene errores de compilación si el contexto no exporta todo.
 */
type PartialThemeHook = {
  theme?: string | null;
  actualTheme?: string | null;
  resolvedTheme?: string | null;
  toggleTheme?: () => void;
  setTheme?: (value: string) => void;
  mounted?: boolean;
};

export default function ThemeToggle(): React.ReactElement | null {
  const t = useLanguage().t;

  // Leemos el hook y lo "aseguramos" con el tipo parcial.
  const themeHook = useTheme() as PartialThemeHook;

  const theme = themeHook?.theme ?? null;
  // some implementations call it actualTheme, others resolvedTheme
  const actualTheme = themeHook?.actualTheme ?? themeHook?.resolvedTheme ?? null;
  const toggleThemeFn = typeof themeHook?.toggleTheme === 'function' ? themeHook.toggleTheme : undefined;
  const setThemeFn = typeof themeHook?.setTheme === 'function' ? themeHook.setTheme : undefined;
  const mounted = typeof themeHook?.mounted === 'boolean' ? themeHook.mounted : true;

  const [isAnimating, setIsAnimating] = useState(false);

  if (!mounted) return null;

  const handleToggle = () => {
    setIsAnimating(true);
    try {
      if (toggleThemeFn) {
        toggleThemeFn();
      } else if (setThemeFn) {
        // Fallback: cycle between light/dark/auto (best-effort)
        const current = actualTheme ?? theme ?? 'auto';
        if (current === 'dark') setThemeFn('light');
        else if (current === 'light') setThemeFn('auto');
        else setThemeFn('dark');
      } else {
        // No-op if the theme API is not available
        // (we keep silent so build doesn't break)
      }
    } finally {
      // quitar animación después de un corto delay
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const label = t('theme.toggle') ?? 'Tema';
  const title = actualTheme ?? theme ?? 'auto';

  return (
    <button
      aria-label={label}
      title={`${label}: ${title}`}
      onClick={handleToggle}
      className={`flex items-center gap-2 px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition ${
        isAnimating ? 'opacity-90 scale-95' : ''
      }`}
      type="button"
    >
      <span className="sr-only">{label}</span>
      {title === 'dark' ? <FaMoon /> : title === 'light' ? <FaSun /> : <FaAdjust />}
      <span className="hidden sm:inline text-sm">{title}</span>
    </button>
  );
}
