'use client';
import { useEffect, useState } from 'react';
import { FaUserCircle, FaUser, FaEnvelope, FaEdit } from 'react-icons/fa';
import { motion } from 'framer-motion';

type LocalUser = {
  name?: string;
  email?: string;
  // tu register puede guardar la foto en `photo` o `image`
  photo?: string;
  image?: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('user');
        if (raw) setUser(JSON.parse(raw) as LocalUser);
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    };

    load();

    // actualiza si cambia localStorage desde otra pestaña
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'user') load();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!user?.name || !user?.email) {
    return (
      <div className="flex justify-center items-center flex-grow">
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
          Cargando datos del perfil...
        </p>
      </div>
    );
  }

  // preferimos photo, si no existe usamos image
  const avatar = (user.photo || user.image) ?? null;

  return (
    <div className="flex justify-center items-center flex-grow bg-gray-100 dark:bg-gray-900 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Banner */}
        <div className="relative h-36 bg-gradient-to-r from-blue-600 to-indigo-500">
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
            {avatar && !imgBroken ? (
              <img
                src={avatar}
                alt="Foto de perfil"
                onError={() => setImgBroken(true)}
                className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg object-cover"
              />
            ) : (
              <FaUserCircle className="text-white dark:text-gray-200" size={100} />
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="mt-16 px-8 py-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{user.name}</h2>
          <p className="text-gray-500 dark:text-gray-400">{user.email}</p>

          {/* Campos */}
          <div className="mt-8 space-y-4">
            <ProfileField icon={<FaUser />} label="Nombre completo" value={user.name || ''} />
            <ProfileField icon={<FaEnvelope />} label="Correo electrónico" value={user.email || ''} />
          </div>

          {/* Acciones */}
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700 transition"
            >
              <FaEdit /> Editar Perfil
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-4 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 bg-gray-50 dark:bg-gray-700 hover:shadow-md transition"
    >
      <div className="text-blue-500 text-lg">{icon}</div>
      <div className="flex flex-col text-left">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-gray-800 dark:text-gray-100 font-medium">{value}</span>
      </div>
    </motion.div>
  );
}
