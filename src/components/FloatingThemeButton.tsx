'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';

export default function FloatingThemeButton() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => setIsAnimating(false), 300);
  };

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={handleToggle}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 rounded-full shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-300 ease-in-out
        ${isAnimating ? 'scale-110' : 'scale-100'}
        ${isDark
          ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
          : 'bg-gray-800 hover:bg-gray-700 text-white'
        }
      `}
      title={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      <span className="text-2xl">{isDark ? '☀' : '🌙'}</span>
    </button>
  );
}
