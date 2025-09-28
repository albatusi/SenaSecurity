'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

export default function ThemeDebugger() {
  const { theme, actualTheme, setTheme, mounted } = useTheme();
  const [htmlClasses, setHtmlClasses] = useState('');
  const [bodyClasses, setBodyClasses] = useState('');

  useEffect(() => {
    const updateClasses = () => {
      setHtmlClasses(document.documentElement.className);
      setBodyClasses(document.body.className);
    };

    updateClasses();
    
    // Escuchar cambios
    const observer = new MutationObserver(updateClasses);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="mb-2 font-bold">🔍 Theme Debug</div>
      <div>Tema: <span className="text-blue-300">{theme}</span></div>
      <div>Real: <span className="text-green-300">{actualTheme}</span></div>
      <div>HTML: <span className="text-yellow-300">{htmlClasses || 'sin clases'}</span></div>
      <div>Body: <span className="text-purple-300">{bodyClasses}</span></div>
      <div className="mt-2 flex gap-1">
        <button 
          onClick={() => setTheme('light')} 
          className="bg-yellow-600 px-2 py-1 rounded text-xs"
        >
          ☀
        </button>
        <button 
          onClick={() => setTheme('dark')} 
          className="bg-slate-700 px-2 py-1 rounded text-xs"
        >
          🌙
        </button>
        <button 
          onClick={() => setTheme('auto')} 
          className="bg-blue-600 px-2 py-1 rounded text-xs"
        >
          🌓
        </button>
      </div>
    </div>
  );
}