'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

function LandingPageContent() {
  const router = useRouter();
  const { t } = useLanguage();

  // showSplash está en el código (se conserva el apartado),
  // pero lo inicializamos en false para que al iniciar se muestre
  // **directamente** el contenido principal (logo + título + CTA único).
  const [showSplash, setShowSplash] = useState(false);

  const [currentImage, setCurrentImage] = useState(0);

  const images = [
    "/carrusel/seguridad1.jpg",
    "/carrusel/seguridad2.jpg",
    "/carrusel/seguridad3.jpg",
    "/carrusel/seguridad4.jpg",
    "/carrusel/seguridad5.jpg",
  ];

  // Cambiar imagen del carrusel cada 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  // CTA único: ir al login
  const handleContinue = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen w-screen relative overflow-hidden">
      {/* Fondo carrusel */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={images[currentImage]}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            <div className="relative w-full h-full">
              <Image
                src={images[currentImage]}
                alt="Imagen de seguridad"
                fill
                className="object-cover object-center"
                priority
              />
              {/* Capa oscura con desenfoque para que el texto resalte */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Splash (conservado en el DOM, pero no visible por defecto) */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center text-white space-y-6 z-50 px-4 cursor-pointer"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
            onClick={() => setShowSplash(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: 1,
                rotate: [0, 360],
              }}
              transition={{
                repeat: Infinity,
                repeatType: 'loop',
                duration: 3,
                ease: 'easeInOut',
              }}
            >
              <Image src="/Logo.png" alt="Logo" width={150} height={150} priority />
            </motion.div>
            <motion.p
              className="text-xl font-semibold text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {t('landing.welcome')}
            </motion.p>
            <p className="text-sm text-center opacity-80">{t('landing.tapToContinue')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido principal — mostrado desde el inicio */}
      {!showSplash && (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-white space-y-8">
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-black/40 backdrop-blur-md">
            <Image src="/Logo.png" alt="Logo" width={80} height={80} />
            <h1 className="text-4xl font-bold">{t('landing.title')}</h1>
          </div>

          {/* CTA Único: Toca para continuar -> login */}
          <div className="flex flex-col space-y-4 w-60">
            <button
              onClick={handleContinue}
              className="bg-blue-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-blue-700 transition"
              aria-label={t('landing.tapToContinue') ?? 'Toca para continuar'}
            >
              {t('landing.tapToContinue') ?? 'Toca para continuar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <LanguageProvider>
      <LandingPageContent />
    </LanguageProvider>
  );
}
