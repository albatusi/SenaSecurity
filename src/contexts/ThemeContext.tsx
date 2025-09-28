'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light'); // Por defecto modo claro
  const [mounted, setMounted] = useState(false);

  // Aplicar tema al DOM
  const applyTheme = (newTheme: Theme) => {
    const isDark = newTheme === 'dark';
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    console.log('🎨 Tema aplicado:', newTheme, 'Clase dark:', isDark, 'HTML:', document.documentElement.className);
  };

  // Inicialización - FORZAR modo claro por defecto
  useEffect(() => {
    try {
      // Cargar tema guardado, pero SIEMPRE defaultear a 'light'
      const saved = localStorage.getItem('theme') as Theme | null;
      
      // FORZAR light por defecto - IGNORAR sistema operativo completamente
      const initialTheme = saved === 'dark' ? 'dark' : 'light';
      
      setTheme(initialTheme);
      applyTheme(initialTheme);
      
      console.log('☀ FORZADO: Tema inicial siempre claro excepto si usuario eligió dark:', initialTheme);
      console.log('🙅‍♂ IGNORANDO preferencias del sistema operativo');
    } catch (e) {
      console.warn('Error al cargar tema, forzando light:', e);
      setTheme('light');
      applyTheme('light');
    } finally {
      setMounted(true);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    setTheme(newTheme);
    applyTheme(newTheme);
    
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.warn('Error al guardar tema:', e);
    }
    
    console.log('🔄 Tema cambiado a:', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}