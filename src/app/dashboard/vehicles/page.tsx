'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Vehicle = {
  id: number;
  name: string;
  plate: string;
  type: 'carro' | 'moto' | 'bicicleta';
  createdAt: string;
};

const LOCAL_KEY = 'vehicles_v1';

// Hook localStorage reutilizable
function useLocalStorage<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch (e) {
      console.error('LocalStorage read error', e);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [key, state]);

  return [state, setState] as const;
}

export default function VehiclesPage() {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>(LOCAL_KEY, []);
  const [form, setForm] = useState({ name: '', plate: '', type: 'carro' as Vehicle['type'] });
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // nuevo estado para modo: 'manual' | 'auto'
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');

  // cámara refs / estados para modo automático
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);

  // API key (pon NEXT_PUBLIC_PLATE_API_KEY en .env.local)
  const PLATE_API_KEY = process.env.NEXT_PUBLIC_PLATE_API_KEY || '';

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // Inicia cámara cuando mode === 'auto'
  useEffect(() => {
    if (mode === 'auto') startCamera();
    else stopCamera();
    return () => stopCamera(); // cleanup al desmontar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMessage(t('vehicles.browserNotSupported'));
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMessage(t('vehicles.cameraStarted'));
    } catch (err) {
      console.error('Error iniciando cámara', err);
      setMessage(t('vehicles.cameraError'));
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.warn('Error al detener cámara', err);
    }
  };

  const validatePlate = (plate: string) => {
    const cleaned = plate.trim().toUpperCase();
    return /^[A-Z0-9-]{3,8}$/.test(cleaned) ? cleaned : null;
  };

  const resetForm = () => setForm({ name: '', plate: '', type: 'carro' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const plate = validatePlate(form.plate || '');
    if (!name) return setMessage(t('vehicles.nameRequired'));
    if (!plate) return setMessage(t('vehicles.invalidPlate'));

    const duplicate = vehicles.find((v) => v.plate === plate && v.id !== editingId);
    if (duplicate) return setMessage(t('vehicles.duplicatePlate'));

    if (editingId) {
      const updated = vehicles.map((v) =>
        v.id === editingId ? { ...v, name, plate, type: form.type, createdAt: v.createdAt } : v
      );
      setVehicles(updated);
      setMessage(t('vehicles.vehicleUpdated'));
      setEditingId(null);
      resetForm();
      return;
    }

    const newVehicle: Vehicle = {
      id: Date.now(),
      name,
      plate,
      type: form.type,
      createdAt: new Date().toISOString(),
    };

    setVehicles((prev) => [newVehicle, ...prev]);
    setMessage(t('vehicles.vehicleRegistered'));
    resetForm();
    // si estabas en modo automático, mantener modo o cambiar a manual según prefieras
  };

  const handleEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setForm({ name: v.name, plate: v.plate, type: v.type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: number) => {
    const ok = confirm(t('vehicles.deleteConfirm'));
    if (!ok) return;
    setVehicles((prev) => prev.filter((p) => p.id !== id));
    setMessage(t('vehicles.vehicleDeleted'));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) => v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.type.includes(q)
    );
  }, [vehicles, query]);

  const exportCSV = () => {
    if (!vehicles.length) return setMessage(t('vehicles.noVehiclesToExport'));
    const header = ['id', 'name', 'plate', 'type', 'createdAt'];
    const rows = vehicles.map((v) => [v.id, v.name, v.plate, v.type, v.createdAt]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicles.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  // ----- AUTOMÁTICO: captura y reconocimiento -----
  const captureAndRecognize = async () => {
    if (!videoRef.current) return setMessage(t('vehicles.cameraNotStarted'));
    if (!PLATE_API_KEY) {
      setMessage(t('vehicles.missingApiKey'));
      return;
    }
    try {
      setRecognizing(true);
      setMessage(t('vehicles.capturingImage'));

      // dibujar frame en canvas
      const video = videoRef.current;
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear contexto del canvas');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // convertir a blob
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      );

      if (!blob) {
        setMessage(t('vehicles.captureError'));
        setRecognizing(false);
        return;
      }

      setMessage(t('vehicles.sendingRecognition'));
      const formData = new FormData();
      formData.append('upload', blob, 'plate.jpg');
      formData.append('regions', 'co');

      const res = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${PLATE_API_KEY}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API error: ${res.status} ${err}`);
      }

      const data = await res.json();

      // interpretar respuesta (según docs)
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        const plateDetected = (r.plate || '').toUpperCase();
        const confidence = r.score ?? (r.confidence ?? null);
        if (plateDetected) {
          setForm((prev) => ({ ...prev, plate: plateDetected }));
          setLastConfidence(confidence ?? null);
          setMessage(`${t('vehicles.plateDetected')}: ${plateDetected}`);
          // desplazar la vista al formulario para completar nombre/tipo y registrar
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setMessage(t('vehicles.noPlateDetected'));
        }
      } else {
        setMessage(t('vehicles.noPlateDetected'));
      }
    } catch (err: unknown) {
      console.error('Error reconocimiento:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessage(t('vehicles.recognitionError') + ': ' + errorMessage);
    } finally {
      setRecognizing(false);
    }
  };

  // función para registrar desde modo automático (usa la misma validación)
  const registerFromAuto = () => {
    // reusar la lógica de handleSubmit sin evento
    const name = form.name.trim();
    const plate = validatePlate(form.plate || '');
    if (!name) return setMessage(t('vehicles.nameRequired'));
    if (!plate) return setMessage(t('vehicles.invalidPlate'));

    const duplicate = vehicles.find((v) => v.plate === plate && v.id !== editingId);
    if (duplicate) return setMessage(t('vehicles.duplicatePlate'));

    const newVehicle: Vehicle = {
      id: Date.now(),
      name,
      plate,
      type: form.type,
      createdAt: new Date().toISOString(),
    };

    setVehicles((prev) => [newVehicle, ...prev]);
    setMessage(t('vehicles.vehicleRegisteredAuto'));
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header + form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {editingId ? t('vehicles.editTitle') : `🚘 ${t('vehicles.pageTitle')}`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('vehicles.subtitle')}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <input
              placeholder={t('vehicles.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
            />
            <button onClick={exportCSV} className="px-3 py-2 bg-green-600 text-white rounded-md hover:brightness-90">
              {t('vehicles.exportCSV')}
            </button>
          </div>
        </div>

        {/* Botones de modo */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`px-4 py-2 rounded-md ${mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
          >
            {t('vehicles.manualMode')}
          </button>
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`px-4 py-2 rounded-md ${mode === 'auto' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
          >
            {t('vehicles.autoMode')}
          </button>
        </div>

        {/* FORMULARIO MANUAL (se muestra si mode === 'manual' o siempre mostramos inputs para registro cuando la placa está precargada) */}
        {(mode === 'manual' || mode === 'auto') && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Nombre propietario - mostrar siempre para que el usuario complete después de reconocimiento */}
            <input
              type="text"
              placeholder={t('vehicles.ownerPlaceholder')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="col-span-1 md:col-span-2 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />

            {/* Placa (autocompletada si venimos de auto) */}
            <input
              type="text"
              placeholder={t('vehicles.platePlaceholder')}
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
              required
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />

            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Vehicle['type'] })}
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="carro">{t('vehicles.typeCar')}</option>
              <option value="moto">{t('vehicles.typeMotorcycle')}</option>
              <option value="bicicleta">{t('vehicles.typeBicycle')}</option>
            </select>

            <div className="md:col-span-3 flex gap-2 mt-2">
              {/* Si estamos en modo auto y ya hay placa detectada, el botón registra rápido usando registerFromAuto */}
              {mode === 'auto' ? (
                <>
                  <button type="button" onClick={registerFromAuto} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold">
                    {t('vehicles.registerAuto')}
                  </button>
                  <button type="button" onClick={() => setMode('manual')} className="px-4 py-3 border rounded-lg">
                    {t('vehicles.changeToManual')}
                  </button>
                </>
              ) : (
                <>
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold">
                    {editingId ? t('vehicles.saveChanges') : t('vehicles.register')}
                  </button>
                  {editingId && (
                    <button type="button" onClick={cancelEdit} className="px-4 py-3 border rounded-lg">
                      {t('vehicles.cancel')}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        )}

        {/* Mensaje */}
        {message && <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">{message}</div>}

        {/* Si estamos en modo automático mostramos el visor de cámara y control */}
        {mode === 'auto' && (
          <div className="mt-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <div className="relative">
                <video ref={videoRef} id="video" className="w-full h-64 object-cover rounded" autoPlay muted playsInline />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-20 border-2 border-white/60 rounded-lg"></div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={captureAndRecognize}
                  disabled={recognizing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
                >
                  {recognizing ? t('vehicles.processing') : t('vehicles.captureAndRecognize')}
                </button>

                <button
                  type="button"
                  onClick={() => { stopCamera(); setMode('manual'); }}
                  className="px-4 py-2 border rounded-md"
                >
                  {t('vehicles.stopCamera')}
                </button>

                {lastConfidence !== null && (
                  <div className="ml-auto text-sm text-gray-600 dark:text-gray-300">
                    {t('vehicles.confidence')}: {(lastConfidence * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de vehículos registrada */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">🧡 {t('vehicles.registeredList')} ({vehicles.length})</h3>

        {filtered.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('vehicles.noMatches')}</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((v) => (
              <li key={v.id} className="p-4 border rounded-lg flex items-center justify-between bg-gradient-to-r from-white to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-lg font-medium text-gray-800 dark:text-white">{v.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600">{v.type}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{v.plate} • {new Date(v.createdAt).toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(v)} className="px-3 py-2 border rounded-md text-sm">{t('vehicles.edit')}</button>
                  <button onClick={() => handleDelete(v.id)} className="px-3 py-2 bg-red-600 text-white rounded-md text-sm">{t('vehicles.delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center">
          <span>{vehicles.length} {t('vehicles.total')}</span>
          <button onClick={() => { setVehicles([]); setMessage(t('vehicles.listCleared')); }} className="underline">{t('vehicles.clearList')}</button>
        </div>
      </div>
    </div>
  );
}
