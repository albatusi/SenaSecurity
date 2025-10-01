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
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-red-500 text-lg font-medium text-center px-4">{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
          {t('profile.noData') || 'No hay datos de usuario.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-10">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl relative transition-all duration-500 transform scale-95 hover:scale-100">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-12 w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-900 shadow-lg transition-transform duration-500">
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt={t('profile.title') || 'Perfil'}
              className="w-full h-full object-cover transition-opacity duration-300 hover:opacity-90"
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-full h-full text-gray-400 dark:text-gray-600 p-2" fill="currentColor">
              <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" />
            </svg>
          )}
        </div>

        <div className="mt-20 px-8 py-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 transition-colors duration-300">{user.nomUsuario || '-'}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-300">{user.emaUsuario || '-'}</p>

          <div className="mt-8 space-y-4">
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
        </div>

        <div className="p-8 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleLogout} className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors duration-300">
            {t('profile.logout') || 'Cerrar Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 bg-gray-50 dark:bg-gray-700 shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="text-blue-500 text-lg">{icon}</div>
      <div className="flex flex-col text-left">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-gray-800 dark:text-gray-100 font-medium">{value}</span>
      </div>
    </div>
  );
}
