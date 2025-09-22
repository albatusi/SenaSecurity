'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

function LandingPageContent() {
  const router = useRouter();
  const { t } = useLanguage();

  const [currentImage, setCurrentImage] = useState(0);
  const [exiting, setExiting] = useState(false);

  const images = [
    "/carrusel/seguridad1.jpg",
    "/carrusel/seguridad2.jpg",
    "/carrusel/seguridad3.jpg",
    "/carrusel/seguridad4.jpg",
    "/carrusel/seguridad5.jpg",
  ];

  // Rotación del carrusel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const triggerExitAndGo = () => {
    if (exiting) return;
    setExiting(true);
    // Tiempo de la animación: 800ms (coincide con transition abajo)
    setTimeout(() => {
      router.push('/login');
    }, 800);
  };

  const handleArrowKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerExitAndGo();
    }
  };

  return (
    // Motion wrapper que moverá TODO hacia arriba cuando exiting=true
    <motion.div
      className="min-h-screen w-screen relative overflow-hidden bg-black"
      animate={exiting ? { y: '-120vh', opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Fondo carrusel */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          >
            <div className="relative w-full h-full">
              <Image
                src={images[currentImage]}
                alt={`Imagen ${currentImage + 1}`}
                fill
                quality={100}
                sizes="(max-width: 640px) 100vw, 1920px"
                className="object-cover object-center"
                priority
              />
              {/* Overlay muy sutil para contraste */}
              <div className="absolute inset-0 bg-black/10" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Título centrado arriba (más grande) */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-xl">
        <Image src="/Logo.png" alt="Logo" width={56} height={56} priority />
        <span className="text-white font-extrabold text-3xl sm:text-4xl md:text-5xl select-none tracking-tight drop-shadow-sm">
          {t('landing.title')}
        </span>
      </div>

      {/* Contenido central (texto pequeño y sobrio) */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 pointer-events-auto">
        {/* Mensaje más pequeño */}
        <p className="text-base sm:text-lg text-white/95 font-medium text-center max-w-2xl leading-relaxed mb-6">
          {t('landing.tapToContinue') ?? 'Toca aquí para continuar'}
        </p>

        {/* Flecha que dispara la animación */}
        <motion.button
          onClick={triggerExitAndGo}
          onKeyDown={handleArrowKey}
          aria-label={t('landing.tapToContinue') ?? 'Toca para continuar'}
          className="inline-flex items-center justify-center p-3 rounded-full bg-white/90 hover:bg-white/100 focus:outline-none focus:ring-2 focus:ring-white/40 shadow"
        >
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12l7 7 7-7" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <LanguageProvider>
      <LandingPageContent />
    </LanguageProvider>
  );
}
