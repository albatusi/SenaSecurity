'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleLanguage = () => {
    setIsAnimating(true);
    const newLanguage = language === 'es' ? 'en' : 'es';
    setLanguage(newLanguage);
    
    // Resetear animación después de completarse
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Etiquetas de idioma */}
      <span 
        className={`text-sm font-semibold transition-all duration-300 cursor-pointer select-none ${
          language === 'es' 
            ? 'text-blue-600 dark:text-blue-400 scale-110' 
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        onClick={() => setLanguage('es')}
      >
        ES
      </span>

      {/* Toggle Switch Mejorado */}
      <div className="relative">
        <button
          onClick={toggleLanguage}
          className={`relative w-16 h-8 rounded-full p-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 hover:shadow-lg ${
            language === 'en' 
              ? 'bg-blue-500 dark:bg-blue-600 shadow-blue-200 dark:shadow-blue-900' 
              : 'bg-gray-300 dark:bg-gray-600 shadow-gray-200 dark:shadow-gray-700'
          } ${isAnimating ? 'scale-105' : 'scale-100'}`}
          aria-label={`Switch to ${language === 'es' ? 'English' : 'Spanish'}`}
        >
          {/* Círculo deslizante con mejores animaciones */}
          <div
            className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ease-out flex items-center justify-center ${
              language === 'en' ? 'translate-x-8 rotate-180' : 'translate-x-0 rotate-0'
            } ${isAnimating ? 'scale-110' : 'scale-100'}`}
          >
            {/* Icono pequeño dentro del círculo */}
            <span className="text-xs opacity-75">
              {language === 'es' ? '🇪🇸' : '🇺🇸'}
            </span>
          </div>
          
          {/* Indicadores de texto en el track */}
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
            <span className={`text-xs font-bold transition-opacity duration-200 ${
              language === 'es' ? 'text-blue-600 opacity-100' : 'text-white opacity-0'
            }`}>
              ES
            </span>
            <span className={`text-xs font-bold transition-opacity duration-200 ${
              language === 'en' ? 'text-white opacity-100' : 'text-gray-400 opacity-0'
            }`}>
              EN
            </span>
          </div>
        </button>
      </div>

      {/* Etiqueta EN */}
      <span 
        className={`text-sm font-semibold transition-all duration-300 cursor-pointer select-none ${
          language === 'en' 
            ? 'text-blue-600 dark:text-blue-400 scale-110' 
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        onClick={() => setLanguage('en')}
      >
        EN
      </span>
    </div>
  );
}
