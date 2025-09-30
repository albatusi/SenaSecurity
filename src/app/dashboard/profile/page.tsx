'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

interface BackendUser {
  nomUsuario?: string;
  emaUsuario?: string;
  docUsuario?: string;
  photoUrl?: string;
  rol?: { nomRol?: string };
  habilitado2FA?: boolean;
}

// Componente principal de la página de perfil
export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<BackendUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('https://backend-x2ed.onrender.com/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (res.status === 403 || res.status === 401) {
            localStorage.removeItem('token');
            router.push('/login');
            return;
          }
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || 'Error al cargar el perfil.');
        }

        const data = await res.json();
        setUser(data.user ?? data);
      } catch (err: unknown) {
        console.error('Error al obtener el perfil:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setError(t('profile.noData') || `No se pudo cargar el perfil: ${msg}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [router, t]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
          {t('profile.loading') || 'Cargando datos del perfil...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900 px-4">
        <p className="text-red-500 text-lg font-medium text-center">{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900 px-4">
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
          {t('profile.noData') || 'No hay datos de usuario.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-10">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Grid: en md+ dos columnas; en móvil una sola columna */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left: avatar + basic info */}
          <div className="p-6 md:p-8 flex flex-col items-center md:items-start text-center md:text-left bg-transparent">
            <div className="relative -mt-12 mb-3">
              <div className="mx-auto md:mx-0 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg"
                   style={{ width: 120, height: 120 }}>
                {user.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoUrl}
                    alt={t('profile.title') || 'Perfil'}
                    className="w-full h-full object-cover"
                    style={{ display: 'block' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-16 h-16" fill="currentColor">
                      <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{user.nomUsuario || '-'}</h2>
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2">{user.emaUsuario || '-'}</p>

            <div className="mt-6 w-full md:w-auto">
              <button
                onClick={handleLogout}
                className="w-full md:w-auto px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors"
              >
                {t('profile.logout') || 'Cerrar Sesión'}
              </button>
            </div>
          </div>

          {/* Right: detalles en grid */}
          <div className="p-6 md:p-8">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ProfileField
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="20" height="20" fill="currentColor">
                      <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" />
                    </svg>
                  }
                  label={t('profile.nameLabel') || 'Nombre completo'}
                  value={user.nomUsuario || '-'}
                />

                <ProfileField
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20" fill="currentColor">
                      <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z" />
                    </svg>
                  }
                  label={t('profile.emailLabel') || 'Correo electrónico'}
                  value={user.emaUsuario || '-'}
                />
              </div>

              {user.docUsuario && (
                <ProfileField
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="20" height="20" fill="currentColor">
                      <path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm0 160c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm448 0c0-17.7 14.3-32 32-32H544c17.7 0 32 14.3 32 32s-14.3 32-32 32H480c-17.7 0-32-14.3-32-32zm32 160c-17.7 0-32-14.3-32-32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32zm32 0c-17.7 0-32-14.3-32-32V320c0-17.7 14.3-32 32-32H544c17.7 0 32 14.3 32 32V448c0 17.7-14.3 32-32 32H512z" />
                    </svg>
                  }
                  label={t('profile.documentLabel') || 'Documento de Identidad'}
                  value={user.docUsuario}
                />
              )}

              {user.rol?.nomRol && (
                <ProfileField
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width="20" height="20" fill="currentColor">
                      <path d="M96 128c0-35.3 28.7-64 64-64h32v64H160c-17.7 0-32 14.3-32 32v192h448V160c0-17.7-14.3-32-32-32H416V64h32c35.3 0 64 28.7 64 64v352H96V128z" />
                    </svg>
                  }
                  label={t('profile.roleLabel') || 'Rol'}
                  value={user.rol.nomRol || '-'}
                />
              )}
            </div>

            {/* opcional: área adicional abajo con spacing para móviles */}
            <div className="mt-6 md:mt-10" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4 bg-gray-50 dark:bg-gray-700 shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="text-blue-500 text-lg flex-shrink-0">{icon}</div>
      <div className="flex flex-col text-left min-w-0">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-gray-800 dark:text-gray-100 font-medium truncate">{value}</span>
      </div>
    </div>
  );
}
