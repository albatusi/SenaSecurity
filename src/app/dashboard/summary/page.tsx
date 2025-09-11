'use client';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

type Movimiento = {
  id: string;
  tipo: 'Entrada' | 'Salida';
  placa: string;
  hora: string;
  createdAt: string;
};

export default function DashboardHome() {
  const { t } = useLanguage();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [horaActual, setHoraActual] = useState(new Date());
  const [isDark, setIsDark] = useState(false);

  const API_URL = 'https://6870b1767ca4d06b34b7971d.mockapi.io/movimientos';

  // Detectar preferencia de tema del sistema y aplicar la clase .dark al <html>
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (matches: boolean) => {
      setIsDark(matches);
      if (matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };
    if (mq) {
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else mq.addListener(handler);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener('change', handler);
        else mq.removeListener(handler);
      };
    } else {
      apply(false);
    }
  }, []);

  // reloj en vivo
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // cargar data API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        const ordenados = data.sort(
          (a: Movimiento, b: Movimiento) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMovimientos(ordenados);
      } catch (err) {
        console.error('Error fetching movimientos', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const entradasHoy = movimientos.filter((m) => m.tipo === 'Entrada' && esHoy(m.createdAt)).length;
  const salidasHoy = movimientos.filter((m) => m.tipo === 'Salida' && esHoy(m.createdAt)).length;
  const dataGrafico = generarActividadSemanal(movimientos, t);

  // Nueva paleta (completamente distinta)
  // - Light: fondos neutros, acento cyan suave para 'Entradas', naranja suave para 'Salidas'
  // - Dark: fondo slate/charcoal, acento cyan oscuro y naranja apagado
  const chartColors = useMemo(() => {
    return {
      // ENTRADAS: cyan (light) -> cyan-dark (dark)
      entradas: isDark ? '#0e7490' : '#06b6d4', // dark: cyan-800, light: cyan-400
      // SALIDAS: orange (light) -> amber-muted (dark)
      salidasLine: isDark ? '#b45309' : '#fb923c', // dark: amber-700 (muted), light: orange-400
      // grillas / ejes / tooltip
      gridStroke: isDark ? '#111827' : '#f1f5f9', // dark: near-black, light: very soft
      axisColor: isDark ? '#94a3b8' : '#475569',  // muted axis colors
      tooltipBg: isDark ? '#0b1220' : '#ffffff',
      tooltipBorder: isDark ? '#1f2937' : '#e5e7eb',
      tooltipText: isDark ? '#e6eef8' : '#0f1724',
      legendColor: isDark ? '#cbd5e1' : '#475569',
      // card accent for left border in dark mode
      cardAccent: isDark ? '#0e7490' : '#06b6d4',
      cardAccentSecondary: isDark ? '#b45309' : '#fb923c',
    };
  }, [isDark]);

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {t('summary.welcomeUser')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('summary.todayDate')} {horaActual.toLocaleDateString()} — {horaActual.toLocaleTimeString()}
          </p>
        </div>

        {/* botón de modo oscuro removido (según solicitud) */}
      </div>

      {/* métricas rápidas: tarjetas neutras en light, tarjetas sobrias con borde acento en dark */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CardWithAccent
          title={t('summary.entriesTitle')}
          value={entradasHoy}
          accent={chartColors.cardAccent}
          isDark={isDark}
          t={t}
        />
        <CardWithAccent
          title={t('summary.exitsTitle')}
          value={salidasHoy}
          accent={chartColors.cardAccentSecondary}
          isDark={isDark}
          t={t}
        />
        <CardWithAccent
          title={t('summary.totalTitle')}
          value={movimientos.length}
          accent={chartColors.cardAccent}
          isDark={isDark}
          t={t}
        />
      </div>

      {/* gráfico tipo "Order Report" */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {t('summary.weeklyReportTitle')}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {formatoRangoSemana()}
            </span>
            <button className="px-2 py-1 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600 dark:bg-slate-700 dark:text-white">
              ▼
            </button>
          </div>
        </div>

        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridStroke} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: chartColors.axisColor }} />
              <YAxis tick={{ fill: chartColors.axisColor }} />
              <Tooltip
                contentStyle={{
                  background: chartColors.tooltipBg,
                  borderColor: chartColors.tooltipBorder,
                  color: chartColors.tooltipText,
                }}
                itemStyle={{ color: chartColors.tooltipText }}
              />
              <Legend wrapperStyle={{ color: chartColors.legendColor }} />
              <Bar
                dataKey="entradas"
                fill={chartColors.entradas}
                radius={[6, 6, 0, 0]}
                name="Entradas"
                barSize={18}
              />
              <Line
                type="monotone"
                dataKey="salidas"
                stroke={chartColors.salidasLine}
                strokeWidth={2}
                name="Salidas"
                dot={{ r: 3, stroke: chartColors.salidasLine, strokeWidth: 1 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* últimos movimientos */}
      <div>
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('summary.lastMovementsTitle')}</h3>
        {movimientos.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">{t('summary.noMovementsMessage')}</p>
        ) : (
          <ul className="bg-white dark:bg-slate-900 rounded shadow divide-y divide-slate-200 dark:divide-slate-700">
            {movimientos.slice(0, 5).map((m) => (
              <li
                key={m.id}
                className="p-4 flex justify-between items-center bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`font-semibold ${
                      m.tipo === 'Entrada'
                        ? (isDark ? 'text-cyan-300' : 'text-cyan-600')
                        : (isDark ? 'text-amber-300' : 'text-orange-500')
                    }`}
                  >
                    {m.tipo}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200">— {m.placa}</span>
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{m.hora}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* COMPONENTES AUXILIARES */

// Tarjeta con borde/acento lateral en dark para darle un look distinto
function CardWithAccent({
  title,
  value,
  accent,
  isDark,
  t,
}: {
  title: string;
  value: number;
  accent: string; // color hex
  isDark: boolean;
  t: (key: string) => string;
}) {
  // En light: fondo muy claro con texto oscuro y pequeño acento en icono
  // En dark: fondo oscuro (slate-800/900) y borde izquierdo con color de acento
  return (
    <div
      className={`relative rounded p-5 shadow-sm flex flex-col justify-between`}
      style={{
        background: isDark ? 'rgba(15,23,42,0.6)' : 'linear-gradient(180deg,#ffffff,#f8fafc)',
        borderLeft: isDark ? `4px solid ${accent}` : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>{title}</p>
      </div>
      <h3 className={`mt-4 text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</h3>
      <div className="mt-3 flex gap-2 items-center">
        {/* pequeño indicador de color */}
        <span
          className="w-6 h-6 rounded-full"
          style={{ background: accent, boxShadow: `0 2px 8px ${accent}20` }}
        />
        <span className="text-xs text-slate-400">{isDark ? t('summary.darkModeActive') : t('summary.lightModeActive')}</span>
      </div>
    </div>
  );
}

function esHoy(fechaStr: string): boolean {
  const date = new Date(fechaStr);
  const hoy = new Date();
  return (
    date.getDate() === hoy.getDate() &&
    date.getMonth() === hoy.getMonth() &&
    date.getFullYear() === hoy.getFullYear()
  );
}

function generarActividadSemanal(movimientos: Movimiento[], t: (key: string) => string) {
  const diasKeys = ['days.sun', 'days.mon', 'days.tue', 'days.wed', 'days.thu', 'days.fri', 'days.sat'];
  const resumen = Array(7)
    .fill(0)
    .map((_, i) => ({
      name: t(diasKeys[i]),
      entradas: 0,
      salidas: 0,
    }));

  movimientos.forEach((m) => {
    const dia = new Date(m.createdAt).getDay();
    if (m.tipo === 'Entrada') resumen[dia].entradas += 1;
    if (m.tipo === 'Salida') resumen[dia].salidas += 1;
  });

  return resumen;
}

function formatoRangoSemana() {
  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - 6);
  return `${inicio.toLocaleDateString()} - ${hoy.toLocaleDateString()}`;
}
