'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUsers, FaCar, FaCalendarDay, FaArrowRight } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin' | string;
  status: 'active' | 'blocked' | string;
  registeredAt: string; // YYYY-MM-DD
};

type Car = {
  id: number;
  plate: string;
  owner: string;
  registeredAt: string; // YYYY-MM-DD
};

// Rutas fuera del componente para evitar recrearlas en cada render
const ROUTES = {
  profile: '/dashboard/profile',
  config: '/dashboard/configuration',
  vehicles: '/dashboard/vehicles',
};

// 🔹 Usuario autenticado (simulación)
const currentUser = {
  name: 'Nicolás',
  role: 'admin',
};

// 🔹 Datos simulados (tipados)
const mockUsers: User[] = [
  { id: 1, name: 'Juan Pérez', email: 'juan@example.com', role: 'user', status: 'active', registeredAt: '2025-08-19' },
  { id: 2, name: 'María López', email: 'maria@example.com', role: 'user', status: 'active', registeredAt: '2025-08-19' },
  { id: 3, name: 'Carlos Gómez', email: 'carlos@example.com', role: 'user', status: 'blocked', registeredAt: '2025-08-18' },
  { id: 4, name: 'Ana Torres', email: 'ana@example.com', role: 'admin', status: 'active', registeredAt: '2025-08-17' },
];

const mockCars: Car[] = [
  { id: 1, plate: 'ABC123', owner: 'Juan Pérez', registeredAt: '2025-08-19' },
  { id: 2, plate: 'XYZ789', owner: 'María López', registeredAt: '2025-08-18' },
  { id: 3, plate: 'LMN456', owner: 'Carlos Gómez', registeredAt: '2025-08-19' },
];

export default function DashboardAdmin() {
  const router = useRouter();
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const liveRef = useRef<HTMLDivElement | null>(null);

  // Determinamos rol sin hacer retornos tempranos antes de declarar hooks
  const isAdmin = currentUser.role === 'admin';

  // Inicialización: cargar datos y prefetch. También redirigimos desde effect si no es admin.
  useEffect(() => {
    setUsers(mockUsers.filter((u) => u.role === 'user'));

    try {
      // tipado seguro para prefetch
      const routerWithPrefetch = router as unknown as { prefetch?: (path: string) => Promise<void> | void };
      if (typeof routerWithPrefetch.prefetch === 'function') {
        routerWithPrefetch.prefetch(ROUTES.profile);
        routerWithPrefetch.prefetch(ROUTES.config);
        routerWithPrefetch.prefetch(ROUTES.vehicles);
      }
    } catch {
      // no romper si prefetch no existe
    }

    if (!isAdmin) {
      // redirige usuarios no autorizados (desde effect)
      router.push('/no-autorizado');
    }
  }, [router, isAdmin]);

  // Filtrar por nombre (máx 5 resultados para el dashboard)
  const filteredUsers = users
    .filter((user) => user.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5);

  // KPIs
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;

  // Nuevos registros (hoy)
  const today = new Date().toISOString().split('T')[0];
  const usersToday = users.filter((u) => u.registeredAt === today).length;
  const carsToday = mockCars.filter((c) => c.registeredAt === today).length;

  // función única para navegar y anunciar (accesible) — estable con useCallback
  const navigateAndAnnounce = useCallback(
    (path: string, label: string) => {
      if (liveRef.current) {
        liveRef.current.textContent = `${label} — ${t('dashboard.navigating') ?? 'Navegando...'}`;
      }
      setTimeout(() => {
        router.push(path);
      }, 120);
    },
    [router, t]
  );

  // --- Global keyboard shortcuts (Alt/Meta + 1/2/3) ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName?.toLowerCase() ?? '';
      const editing = ['input', 'textarea', 'select'].includes(tag) || active?.isContentEditable;
      if (editing) return;

      const modifier = e.altKey || e.metaKey;
      if (modifier && !e.shiftKey && !e.ctrlKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            navigateAndAnnounce(ROUTES.profile, t('dashboard.profileTitle') ?? 'Perfil');
            break;
          case '2':
            e.preventDefault();
            navigateAndAnnounce(ROUTES.config, t('dashboard.configurationTitle') ?? 'Configuración');
            break;
          case '3':
            e.preventDefault();
            navigateAndAnnounce(ROUTES.vehicles, t('dashboard.vehiclesTitle') ?? 'Vehículos');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigateAndAnnounce, t]);

  // Si no es admin no se renderiza la UI (ya redirigimos desde el effect)
  if (!isAdmin) return null;

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">
          <span className="inline-flex items-center gap-2">
            <FaUsers className="text-slate-600 dark:text-slate-300" />
            {t('dashboard.homePanel')}
          </span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.quickSummary')}</p>
      </div>

      {/* KPIs y resto de UI (sin cambios funcionales) */}
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

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-medium text-slate-700 dark:text-slate-200">{t('dashboard.quickAccessTitle')}</h2>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <span className="mr-3">{t('dashboard.shortcuts') ?? 'Atajos:'}</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">Alt/⌘ + 1</kbd>
            <span className="mx-1 text-slate-400">/</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">Alt/⌘ + 2</kbd>
            <span className="mx-1 text-slate-400">/</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">Alt/⌘ + 3</kbd>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigateAndAnnounce(ROUTES.profile, t('dashboard.profileTitle') ?? 'Perfil')}
            aria-label={t('dashboard.profileTitle')}
            aria-describedby="q-access-profile-desc"
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
          >
            <FaUsers className="text-slate-600 dark:text-slate-300 text-3xl" />
            <div className="font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.profileTitle')}</div>
            <div id="q-access-profile-desc" className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.profileDescription')}
            </div>
            <FaArrowRight className="text-slate-400 dark:text-slate-500 mt-2" />
          </button>

          <button
            type="button"
            onClick={() => navigateAndAnnounce(ROUTES.config, t('dashboard.configurationTitle') ?? 'Configuración')}
            aria-label={t('dashboard.configurationTitle')}
            aria-describedby="q-access-config-desc"
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
          >
            <FaCalendarDay className="text-slate-600 dark:text-slate-300 text-3xl" />
            <div className="font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.configurationTitle')}</div>
            <div id="q-access-config-desc" className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.configurationDescription')}
            </div>
            <FaArrowRight className="text-slate-400 dark:text-slate-500 mt-2" />
          </button>

          <button
            type="button"
            onClick={() => navigateAndAnnounce(ROUTES.vehicles, t('dashboard.vehiclesTitle') ?? 'Vehículos')}
            aria-label={t('dashboard.vehiclesTitle')}
            aria-describedby="q-access-vehicles-desc"
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
          >
            <FaCar className="text-slate-600 dark:text-slate-300 text-3xl" />
            <div className="font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.vehiclesTitle')}</div>
            <div id="q-access-vehicles-desc" className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.vehiclesDescription')}
            </div>
            <FaArrowRight className="text-slate-400 dark:text-slate-500 mt-2" />
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <input
          type="text"
          placeholder={t('dashboard.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('dashboard.searchPlaceholder')}
          className="w-full sm:w-1/3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <table className="w-full text-left" role="table" aria-label={t('dashboard.usersTableAria') ?? 'Users'}>
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
                <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">{t('dashboard.noUsersFound')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
