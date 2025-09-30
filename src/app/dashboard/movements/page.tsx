// src/app/[ruta]/MovementsPage.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { FaCarSide, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';

type Movimiento = {
  id: string;
  tipo: 'Entrada' | 'Salida';
  placa: string;
  hora: string;
  createdAt: string;
};

export default function MovementsPage() {
  const { t } = useLanguage();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [placa, setPlaca] = useState('');
  const [horaActual, setHoraActual] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const pollingRef = useRef<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_MOVEMENTS_API ?? 'https://6870b1767ca4d06b34b7971d.mockapi.io/movimientos';

  // Detectar móvil / tablet por width — evita uso de window en SSR
  useEffect(() => {
    const mm = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    mm();
    window.addEventListener('resize', mm);
    return () => window.removeEventListener('resize', mm);
  }, []);

  // Hora actual (reloj)
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch y polling
  useEffect(() => {
    fetchMovimientos();

    // polling cada 3000ms
    pollingRef.current = window.setInterval(() => {
      fetchMovimientos().catch(() => {
        /* ya manejado en fetchMovimientos */
      });
    }, 3000);

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch con manejo de errores
  const fetchMovimientos = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data: Movimiento[] = await res.json();

      // ordenar por createdAt descendente
      const ordenados = data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setMovimientos(ordenados);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(t('movements.fetchError') ? `${t('movements.fetchError')}: ${msg}` : `Error al obtener movimientos: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const validarPlaca = (p: string) => {
    const cleaned = (p || '').trim().toUpperCase();
    return cleaned.length >= 3 ? cleaned : null;
  };

  const registrar = async (tipo: 'Entrada' | 'Salida') => {
    const placaVal = validarPlaca(placa);
    if (!placaVal) {
      alert(t('movements.invalidPlate') ?? 'Placa inválida');
      return;
    }

    const nuevo = {
      tipo,
      placa: placaVal,
      hora: horaActual.toLocaleTimeString(),
      createdAt: new Date().toISOString(),
    };

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setPlaca('');
      // reload rapido
      await fetchMovimientos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(t('movements.postError') ? `${t('movements.postError')}: ${msg}` : `Error al registrar: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-900 dark:to-black text-white p-6 rounded-2xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white/10">
              <FaCarSide className="text-3xl" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold">{t('movements.title') ?? 'Control de Movimientos'}</h2>
              <p className="text-sm text-slate-200/90 mt-1">{t('movements.subtitle') ?? 'Registra entradas y salidas en tiempo real'}</p>
            </div>
          </div>

          <div className="text-sm text-slate-200">
            <div>{horaActual.toLocaleDateString()}</div>
            <div className="font-medium">{horaActual.toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('movements.registerNew') ?? 'Registrar movimiento'}</h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            registrar('Entrada');
          }}
          className="flex flex-col sm:flex-row gap-3 items-stretch"
          aria-describedby="movements-form-desc"
        >
          <label className="sr-only" htmlFor="plate-input">{t('movements.platePlaceholder') ?? 'Placa'}</label>
          <input
            id="plate-input"
            type="text"
            placeholder={t('movements.platePlaceholder') ?? 'Placa (ej: ABC123)'}
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-600 dark:bg-gray-900 dark:text-white shadow-sm"
            aria-label={t('movements.platePlaceholder') ?? 'Placa'}
            maxLength={12}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => registrar('Entrada')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm disabled:opacity-60 transition"
              aria-label={t('movements.entry') ?? 'Registrar entrada'}
            >
              <FaSignInAlt /> {t('movements.entry') ?? 'Entrada'}
            </button>

            <button
              type="button"
              onClick={() => registrar('Salida')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm disabled:opacity-60 transition"
              aria-label={t('movements.exit') ?? 'Registrar salida'}
            >
              <FaSignOutAlt /> {t('movements.exit') ?? 'Salida'}
            </button>
          </div>
        </form>

        <p id="movements-form-desc" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {t('movements.formHelp') ?? 'Ingresa la placa y presiona Entrada o Salida.'}
        </p>

        {/* Mensajes */}
        <div role="status" aria-live="polite" className="mt-3">
          {loading && <div className="text-sm text-slate-600 dark:text-slate-300">Cargando...</div>}
          {error && <div className="text-sm text-rose-600 dark:text-rose-400">{error}</div>}
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('movements.history') ?? 'Historial'}</h3>

        {/* Si mobile -> mostrar cards apiladas */}
        {isMobile ? (
          <div className="space-y-3">
            {movimientos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">{t('movements.noMovements') ?? 'No hay movimientos aún.'}</p>
            ) : (
              movimientos.map((m) => (
                <article
                  key={m.id}
                  className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm"
                  role="article"
                  aria-label={`${m.tipo} - ${m.placa}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{m.placa}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</div>
                    </div>

                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${m.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-100' : 'bg-rose-100 text-rose-800 dark:bg-rose-700 dark:text-rose-100'}`}>
                        {m.tipo}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.hora}</div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
          // Desktop / tablet: tabla
          <>
            {movimientos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">{t('movements.noMovements') ?? 'No hay movimientos aún.'}</p>
            ) : (
              <div className="overflow-x-auto rounded-md">
                <table className="w-full min-w-[640px] table-auto border-collapse">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="p-3 text-left text-sm font-medium">{t('movements.plate') ?? 'Placa'}</th>
                      <th className="p-3 text-left text-sm font-medium">{t('movements.type') ?? 'Tipo'}</th>
                      <th className="p-3 text-left text-sm font-medium">{t('movements.time') ?? 'Hora'}</th>
                      <th className="p-3 text-left text-sm font-medium">{t('movements.date') ?? 'Fecha'}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {movimientos.map((m, idx) => (
                      <tr
                        key={m.id}
                        className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'} hover:bg-slate-50 dark:hover:bg-gray-700 transition`}
                      >
                        <td className="p-3 text-sm font-semibold text-gray-800 dark:text-gray-100">{m.placa}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${m.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-100' : 'bg-rose-100 text-rose-800 dark:bg-rose-700 dark:text-rose-100'}`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{m.hora}</td>
                        <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{new Date(m.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
