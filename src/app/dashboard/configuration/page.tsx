'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FaUser, FaEnvelope, FaIdCard, FaUserTag, FaGlobe, FaSave, FaCog } from 'react-icons/fa';

interface UserProfile {
  name: string;
  email: string;
  document: string;
  role: string;
}

export default function ConfigurationPage() {
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    document: '',
    role: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Cargar datos del perfil desde localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setProfile({
        name: user.name || '',
        email: user.email || '',
        document: user.document || '',
        role: user.role || '',
      });
    }
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'es' | 'en');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Simular delay de guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Guardar en localStorage
      const currentUser = localStorage.getItem('user');
      if (currentUser) {
        const user = JSON.parse(currentUser);
        const updatedUser = { ...user, ...profile };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setMessage(t('config.success'));
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage(t('config.error'));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center justify-center gap-3">
          <FaCog className="text-blue-600" />
          {t('config.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Personaliza tu perfil y configura las preferencias del sistema
        </p>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`p-4 rounded-lg text-center font-medium ${
          message.includes('exitosamente') || message.includes('successfully')
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sección de Perfil */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
            <FaUser className="text-blue-600 text-xl" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {t('config.profile')}
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <FaUser className="inline mr-2" />
                {t('config.name')}
              </label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Ingresa tu nombre completo"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <FaEnvelope className="inline mr-2" />
                {t('config.email')}
              </label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="correo@ejemplo.com"
              />
            </div>

            {/* Documento */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <FaIdCard className="inline mr-2" />
                {t('config.document')}
              </label>
              <input
                type="text"
                name="document"
                value={profile.document}
                onChange={handleProfileChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Número de documento"
              />
            </div>

            {/* Rol */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <FaUserTag className="inline mr-2" />
                {t('config.role')}
              </label>
              <select
                name="role"
                value={profile.role}
                onChange={handleProfileChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="admin">Administrador</option>
                <option value="usuario">Usuario</option>
              </select>
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              <FaSave />
              {isLoading ? 'Guardando...' : t('config.saveProfile')}
            </button>
          </form>
        </div>

        {/* Sección de Idioma */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
            <FaGlobe className="text-green-600 text-xl" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {t('config.language')}
            </h2>
          </div>

          <div className="space-y-4">
            {/* Idioma actual */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('config.currentLang')}:
              </p>
              <p className="text-lg font-medium text-gray-800 dark:text-white">
                {language === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
              </p>
            </div>

            {/* Selector de idioma */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('config.selectLang')}
              </label>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="es">🇪🇸 {t('config.spanish')}</option>
                <option value="en">🇺🇸 {t('config.english')}</option>
              </select>
            </div>

            {/* Información adicional */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 El idioma se cambia automáticamente y se guarda para futuras sesiones.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Información del Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="font-medium text-gray-600 dark:text-gray-400">Versión</p>
            <p className="text-gray-800 dark:text-white">v1.0.0</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="font-medium text-gray-600 dark:text-gray-400">Framework</p>
            <p className="text-gray-800 dark:text-white">Next.js 15</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="font-medium text-gray-600 dark:text-gray-400">Estado</p>
            <p className="text-green-600 font-medium">🟢 Activo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
