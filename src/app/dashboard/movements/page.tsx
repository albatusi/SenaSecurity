'use client';
import { useEffect, useState } from 'react';
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

  const API_URL = 'https://6870b1767ca4d06b34b7971d.mockapi.io/movimientos';

  useEffect(() => {
    fetchMovimientos();
    const interval = setInterval(fetchMovimientos, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMovimientos = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
    const ordenados = data.sort(
      (a: Movimiento, b: Movimiento) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setMovimientos(ordenados);
  };

  const registrar = async (tipo: 'Entrada' | 'Salida') => {
    if (!placa.trim()) return alert(t('movements.invalidPlate'));

    const nuevo = {
      tipo,
      placa: placa.toUpperCase(),
      hora: horaActual.toLocaleTimeString(),
      createdAt: new Date().toISOString(),
    };

    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevo),
    });

    setPlaca('');
    fetchMovimientos();
  };

  return (
    <div className="space-y-10">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-8 rounded-2xl shadow-lg">
        <h2 className="text-4xl font-extrabold flex items-center gap-3">
          <FaCarSide className="text-5xl drop-shadow-md" />
          {t('movements.title')}
        </h2>
        <p className="text-gray-100 mt-2 text-lg">
          {horaActual.toLocaleDateString()} —{' '}
          <span className="font-semibold">{horaActual.toLocaleTimeString()}</span>
        </p>
      </div>

      {/* Formulario */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-6 rounded-2xl shadow-md space-y-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {t('movements.registerNew')}
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <input
            type="text"
            placeholder={t('movements.platePlaceholder')}
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            className="p-3 border border-gray-300 dark:border-gray-600 rounded-xl w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-gray-800 dark:text-white shadow-sm"
          />
          <div className="flex gap-3">
            <button
              onClick={() => registrar('Entrada')}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white px-6 py-3 rounded-xl shadow-md transition font-semibold"
            >
              <FaSignInAlt /> {t('movements.entry')}
            </button>
            <button
              onClick={() => registrar('Salida')}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-90 text-white px-6 py-3 rounded-xl shadow-md transition font-semibold"
            >
              <FaSignOutAlt /> {t('movements.exit')}
            </button>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-6 rounded-2xl shadow-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {t('movements.history')}
        </h3>
        {movimientos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            {t('movements.noMovements')}
          </p>
        ) : (
          <table className="w-full border-collapse rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <th className="p-4 text-left">{t('movements.plate')}</th>
                <th className="p-4 text-left">{t('movements.type')}</th>
                <th className="p-4 text-left">{t('movements.time')}</th>
                <th className="p-4 text-left">{t('movements.date')}</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m, index) => (
                <tr
                  key={m.id}
                  className={`transition ${
                    index % 2 === 0
                      ? 'bg-gray-50 dark:bg-gray-800'
                      : 'bg-white dark:bg-gray-900'
                  } hover:bg-cyan-50 dark:hover:bg-gray-700`}
                >
                  <td className="p-4 font-semibold text-gray-900 dark:text-white">
                    {m.placa}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        m.tipo === 'Entrada'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {m.tipo}
                    </span>
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">
                    {m.hora}
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
