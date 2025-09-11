'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUsers, FaCar, FaCalendarDay, FaArrowRight } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';

// 🔹 Usuario autenticado (simulación)
const currentUser = {
  name: 'Nicolás',
  role: 'admin',
};

// 🔹 Lista de usuarios simulados
const mockUsers = [
  { id: 1, name: 'Juan Pérez', email: 'juan@example.com', role: 'user', status: 'active', registeredAt: '2025-08-19' },
  { id: 2, name: 'María López', email: 'maria@example.com', role: 'user', status: 'active', registeredAt: '2025-08-19' },
  { id: 3, name: 'Carlos Gómez', email: 'carlos@example.com', role: 'user', status: 'blocked', registeredAt: '2025-08-18' },
  { id: 4, name: 'Ana Torres', email: 'ana@example.com', role: 'admin', status: 'active', registeredAt: '2025-08-17' }, // no se mostrará
];

// 🔹 Lista de autos registrados simulados
const mockCars = [
  { id: 1, plate: 'ABC123', owner: 'Juan Pérez', registeredAt: '2025-08-19' },
  { id: 2, plate: 'XYZ789', owner: 'María López', registeredAt: '2025-08-18' },
  { id: 3, plate: 'LMN456', owner: 'Carlos Gómez', registeredAt: '2025-08-19' },
];

export default function DashboardAdmin() {
  const router = useRouter();
  const { t } = useLanguage();
  const [users, setUsers] = useState<typeof mockUsers>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentUser.role !== 'admin') {
      router.push('/no-autorizado');
    } else {
      setUsers(mockUsers.filter((user) => user.role === 'user'));
    }
  }, [router]);

  if (currentUser.role !== 'admin') return null;

  // Filtrar por nombre (máx 5 resultados para el dashboard)
  const filteredUsers = users
    .filter((user) => user.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5);

  // KPIs (palette suave)
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;

  // Nuevos registros (hoy)
  const today = new Date().toISOString().split('T')[0];
  const usersToday = users.filter((u) => u.registeredAt === today).length;
  const carsToday = mockCars.filter((c) => c.registeredAt === today).length;

  // helper para accesibilidad: manejar Enter en botones que son divs
  const handleKeyPush = (e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(path);
    }
  };

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Encabezado */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">
          <span className="inline-flex items-center gap-2">
            <FaUsers className="text-slate-600 dark:text-slate-300" />
            {t('dashboard.homePanel')}
          </span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('dashboard.quickSummary')}
        </p>
      </div>

      {/* KPIs: paleta suave y coherente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.totalUsersLabel')}</p>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalUsers}</h2>
        </div>
        <div className="rounded-xl p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-700 shadow-sm">
          <p className="text-xs text-emerald-600 dark:text-emerald-300">{t('dashboard.activeLabel')}</p>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{activeUsers}</h2>
        </div>
        <div className="rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-700 shadow-sm">
          <p className="text-xs text-indigo-600 dark:text-indigo-300">{t('dashboard.registeredTodayLabel')}</p>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{usersToday}</h2>
        </div>
      </div>

      {/* Autos registrados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-700 shadow-sm text-center">
          <p className="text-xs text-amber-700 dark:text-amber-300">{t('dashboard.registeredCars')}</p>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{mockCars.length}</h2>
        </div>
        <div className="rounded-xl p-4 bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-700 shadow-sm text-center">
          <p className="text-xs text-sky-700 dark:text-sky-300">{t('dashboard.carsTodayLabel')}</p>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{carsToday}</h2>
        </div>
      </div>

      {/* Accesos rápidos: ahora son buttons (accesibles) */}
      <div>
        <h2 className="text-xl font-medium text-slate-700 dark:text-slate-200 mb-3">{t('dashboard.quickAccessTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard/perfil')}
            onKeyDown={(e) => handleKeyPush(e, '/dashboard/perfil')}
            aria-label="Ir a Perfil"
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <FaUsers className="text-slate-600 dark:text-slate-300 text-3xl" />
            <div className="font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.profileTitle')}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.profileDescription')}</div>
            <FaArrowRight className="text-slate-400 dark:text-slate-500 mt-2" />
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard/configuracion')}
            onKeyDown={(e) => handleKeyPush(e, '/dashboard/configuracion')}
            aria-label="Ir a Configuración"
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <FaCalendarDay className="text-slate-600 dark:text-slate-300 text-3xl" />
            <div className="font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.configurationTitle')}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.configurationDescription')}</div>
            <FaArrowRight className="text-slate-400 dark:text-slate-500 mt-2" />
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard/vehiculos')}
            onKeyDown={(e) => handleKeyPush(e, '/dashboard/vehiculos')}
            aria-label="Ir a Vehículos"
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <FaCar className="text-slate-600 dark:text-slate-300 text-3xl" />
            <div className="font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.vehiclesTitle')}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.vehiclesDescription')}</div>
            <FaArrowRight className="text-slate-400 dark:text-slate-500 mt-2" />
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="flex justify-end">
        <input
          type="text"
          placeholder={t('dashboard.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-1/3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
        />
      </div>

      {/* Tabla simplificada (solo nombre) */}
      <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">{t('dashboard.nameColumn')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <td className="px-6 py-3 text-slate-700 dark:text-slate-100">{user.name}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                  {t('dashboard.noUsersFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
