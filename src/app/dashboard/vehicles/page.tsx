'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Vehicle = {
  id: number;
  name: string;
  plate: string;
  type: 'carro' | 'moto' | 'bicicleta';
  createdAt: string;
  facePhoto?: string | null;
};

const LOCAL_KEY = 'vehicles_v1';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch (e) {
      console.error('LocalStorage read error', e);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [key, state]);

  return [state, setState] as const;
}

/* Types para PlateRecognizer (simplificados) */
interface PlateResult {
  plate?: string;
  score?: number;
  confidence?: number;
}

interface PlateRecognizerResponse {
  results?: PlateResult[];
  // otros campos ignorados
}

export default function VehiclesPage() {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>(LOCAL_KEY, []);
  const [form, setForm] = useState({ name: '', plate: '', type: 'carro' as Vehicle['type'] });
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<'manual' | 'auto'>('manual');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);

  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const PLATE_API_KEY = process.env.NEXT_PUBLIC_PLATE_API_KEY ?? '';

  useEffect(() => {
    if (!message) return;
    const tmo = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(tmo);
  }, [message]);

  // Observa mode y arranca/detiene cámara
  useEffect(() => {
    if (mode === 'auto' || mode === 'manual') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const startCamera = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMessage(t('vehicles.browserNotSupported') ?? 'Tu navegador no soporta cámara');
        return;
      }
      // Constraints con fallback: prefer environment
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // autoplay bloqueado: continuar sin lanzar
        }
      }
      setMessage(t('vehicles.cameraStarted') ?? 'Cámara iniciada');
    } catch (err: unknown) {
      console.error('Error iniciando cámara', err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(t('vehicles.cameraError') ?? `Error al iniciar la cámara: ${msg}`);
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
        try {
          (videoRef.current as HTMLVideoElement).srcObject = null;
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Error al detener cámara', err);
    }
  };

  const validatePlate = (plate: string) => {
    const cleaned = plate.trim().toUpperCase();
    return /^[A-Z0-9-]{3,8}$/.test(cleaned) ? cleaned : null;
  };

  const resetForm = () => {
    setForm({ name: '', plate: '', type: 'carro' });
    setFacePhoto(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const plate = validatePlate(form.plate || '');
    if (!name) return setMessage(t('vehicles.nameRequired') ?? 'Nombre requerido');
    if (!plate) return setMessage(t('vehicles.invalidPlate') ?? 'Placa inválida');

    const duplicate = vehicles.find((v) => v.plate === plate && v.id !== editingId);
    if (duplicate) return setMessage(t('vehicles.duplicatePlate') ?? 'Placa duplicada');

    if (editingId !== null) {
      const updated = vehicles.map((v) =>
        v.id === editingId ? { ...v, name, plate, type: form.type, createdAt: v.createdAt, facePhoto } : v
      );
      setVehicles(updated);
      setMessage(t('vehicles.vehicleUpdated') ?? 'Vehículo actualizado');
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
      facePhoto,
    };

    setVehicles((prev) => [newVehicle, ...prev]);
    setMessage(t('vehicles.vehicleRegistered') ?? 'Vehículo registrado');
    resetForm();
  };

  const handleEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setForm({ name: v.name, plate: v.plate, type: v.type });
    setFacePhoto(v.facePhoto || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: number) => {
    const ok = confirm(t('vehicles.deleteConfirm') ?? '¿Eliminar este vehículo?');
    if (!ok) return;
    setVehicles((prev) => prev.filter((p) => p.id !== id));
    setMessage(t('vehicles.vehicleDeleted') ?? 'Vehículo eliminado');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) => v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.type.includes(q)
    );
  }, [vehicles, query]);

  const exportCSV = () => {
    if (!vehicles.length) return setMessage(t('vehicles.noVehiclesToExport') ?? 'No hay vehículos para exportar');
    const header = ['id', 'name', 'plate', 'type', 'createdAt', 'facePhoto'];
    const rows = vehicles.map((v) => [v.id, v.name, v.plate, v.type, v.createdAt, v.facePhoto || '']);
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((c) => {
            const cell = String(c ?? '');
            const escaped = cell.replace(/"/g, '""');
            if (/[",\n]/.test(cell)) return `"${escaped}"`;
            return escaped;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicles.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage(t('vehicles.csvExported') ?? 'CSV exportado');
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  // ----- AUTOMÁTICO: captura y reconocimiento -----
  const captureAndRecognize = async () => {
    if (!videoRef.current) return setMessage(t('vehicles.cameraNotStarted') ?? 'Cámara no iniciada');
    if (!PLATE_API_KEY) {
      setMessage(t('vehicles.missingApiKey') ?? 'Falta API key');
      return;
    }
    try {
      setRecognizing(true);
      setMessage(t('vehicles.capturingImage') ?? 'Capturando imagen...');

      const video = videoRef.current;
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      // Ajustamos el tamaño según el video actual
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear contexto del canvas');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob: Blob | null = await new Promise((resolve: (b: Blob | null) => void) =>
        canvas.toBlob((b: Blob | null) => resolve(b), 'image/jpeg', 0.9)
      );

      if (!blob) {
        setMessage(t('vehicles.captureError') ?? 'Error al capturar');
        setRecognizing(false);
        return;
      }

      setMessage(t('vehicles.sendingRecognition') ?? 'Enviando a reconocimiento...');

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
        const errText = await res.text();
        throw new Error(`API error: ${res.status} ${errText}`);
      }

      const data = (await res.json()) as PlateRecognizerResponse;

      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        const plateDetected = (r.plate || '').toString().toUpperCase();
        const confidence = (r.score ?? r.confidence) ?? null;
        if (plateDetected) {
          setForm((prev) => ({ ...prev, plate: plateDetected }));
          setLastConfidence(confidence ?? null);
          setMessage(`${t('vehicles.plateDetected') ?? 'Placa detectada'}: ${plateDetected}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setMessage(t('vehicles.noPlateDetected') ?? 'No se detectó placa');
        }
      } else {
        setMessage(t('vehicles.noPlateDetected') ?? 'No se detectó placa');
      }
    } catch (err: unknown) {
      console.error('Error reconocimiento:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage((t('vehicles.recognitionError') ?? 'Error de reconocimiento') + ': ' + msg);
    } finally {
      setRecognizing(false);
    }
  };

  const registerFromAuto = () => {
    const name = form.name.trim();
    const plate = validatePlate(form.plate || '');
    if (!name) return setMessage(t('vehicles.nameRequired') ?? 'Nombre requerido');
    if (!plate) return setMessage(t('vehicles.invalidPlate') ?? 'Placa inválida');

    const duplicate = vehicles.find((v) => v.plate === plate && v.id !== editingId);
    if (duplicate) return setMessage(t('vehicles.duplicatePlate') ?? 'Placa duplicada');

    const newVehicle: Vehicle = {
      id: Date.now(),
      name,
      plate,
      type: form.type,
      createdAt: new Date().toISOString(),
      facePhoto,
    };

    setVehicles((prev) => [newVehicle, ...prev]);
    setMessage(t('vehicles.vehicleRegisteredAuto') ?? 'Vehículo registrado automáticamente');
    resetForm();
  };

  const captureFacePhoto = () => {
    if (!videoRef.current) return setMessage(t('vehicles.cameraNotStarted') ?? 'Cámara no iniciada');
    const video = videoRef.current;
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return setMessage(t('vehicles.captureError') ?? 'Error al capturar');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setFacePhoto(dataUrl);
    setMessage(t('vehicles.photoCaptured') ?? 'Foto capturada');
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header + form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {editingId !== null ? t('vehicles.editTitle') ?? 'Editar vehículo' : <>🚘 {t('vehicles.pageTitle') ?? 'Registro de vehículos'}</>}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('vehicles.subtitle')}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              placeholder={t('vehicles.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white w-full sm:w-72"
            />
            <button onClick={exportCSV} className="px-3 py-2 bg-green-600 text-white rounded-md hover:brightness-90 w-full sm:w-auto">
              {t('vehicles.exportCSV') ?? 'Exportar CSV'}
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
            {t('vehicles.manualMode') ?? 'Manual'}
          </button>
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`px-4 py-2 rounded-md ${mode === 'auto' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
          >
            {t('vehicles.autoMode') ?? 'Automático'}
          </button>
        </div>

        {/* FORMULARIO */}
        {(mode === 'manual' || mode === 'auto') && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder={t('vehicles.ownerPlaceholder') ?? 'Nombre del propietario'}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="col-span-1 md:col-span-2 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
            <input
              type="text"
              placeholder={t('vehicles.platePlaceholder') ?? 'Placa'}
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
              <option value="carro">{t('vehicles.typeCar') ?? 'Carro'}</option>
              <option value="moto">{t('vehicles.typeMotorcycle') ?? 'Moto'}</option>
              <option value="bicicleta">{t('vehicles.typeBicycle') ?? 'Bicicleta'}</option>
            </select>

            <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-4 mt-2">
              {facePhoto && (
                // mantenemos <img> para data URLs (aceptable)
                // eslint-disable-next-line @next/next/no-img-element
                <img src={facePhoto} alt="Foto rostro" className="w-24 h-24 rounded-full object-cover border border-gray-300 dark:border-gray-600" />
              )}

              <div className="flex gap-2 w-full sm:w-auto">
                <button type="button" onClick={captureFacePhoto} className="px-4 py-2 border rounded-md w-full sm:w-auto">
                  {t('vehicles.captureFace') ?? 'Capturar rostro'}
                </button>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col sm:flex-row gap-2 mt-2">
              {mode === 'auto' ? (
                <>
                  <button type="button" onClick={registerFromAuto} className="w-full sm:flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold">
                    {t('vehicles.registerAuto') ?? 'Registrar (auto)'}
                  </button>
                  <button type="button" onClick={() => setMode('manual')} className="w-full sm:w-auto px-4 py-3 border rounded-lg">
                    {t('vehicles.changeToManual') ?? 'Cambiar a manual'}
                  </button>
                </>
              ) : (
                <>
                  <button type="submit" className="w-full sm:flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold">
                    {editingId !== null ? t('vehicles.saveChanges') ?? 'Guardar cambios' : t('vehicles.register') ?? 'Registrar'}
                  </button>
                  {editingId !== null && (
                    <button type="button" onClick={cancelEdit} className="w-full sm:w-auto px-4 py-3 border rounded-lg">
                      {t('vehicles.cancel') ?? 'Cancelar'}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        )}

        {message && <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">{message}</div>}

        {/* Video preview for manual mode (still useful) */}
        {mode === 'manual' && (
          <div className="mt-4 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg max-w-4xl mx-auto">
            <video
              ref={videoRef}
              className="w-full h-48 sm:h-64 md:h-72 lg:h-80 object-cover rounded"
              autoPlay
              muted
              playsInline
            />
          </div>
        )}

        {/* Auto mode: video + overlay + controls responsive */}
        {mode === 'auto' && (
          <div className="mt-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <div className="relative">
                <video
                  ref={videoRef}
                  id="video"
                  className="w-full h-48 sm:h-64 md:h-72 lg:h-80 object-cover rounded"
                  autoPlay
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-11/12 sm:w-3/4 lg:w-1/2 h-20 border-2 border-white/60 rounded-lg"></div>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={captureAndRecognize}
                  disabled={recognizing}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
                >
                  {recognizing ? t('vehicles.processing') ?? 'Procesando...' : t('vehicles.captureAndRecognize') ?? 'Capturar y reconocer'}
                </button>

                <button
                  type="button"
                  onClick={() => { stopCamera(); setMode('manual'); }}
                  className="w-full sm:w-auto px-4 py-2 border rounded-md"
                >
                  {t('vehicles.stopCamera') ?? 'Detener cámara'}
                </button>

                {lastConfidence !== null && (
                  <div className="ml-auto text-sm text-gray-600 dark:text-gray-300">
                    {t('vehicles.confidence') ?? 'Confianza'}: {(lastConfidence * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de vehículos registrada */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          🧡 {t('vehicles.registeredList') ?? 'Vehículos registrados'} ({vehicles.length})
        </h3>

        {filtered.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('vehicles.noMatches') ?? 'No hay coincidencias'}</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((v) => (
              <li key={v.id} className="p-4 border rounded-lg flex items-center justify-between bg-gradient-to-r from-white to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
                <div className="flex items-center gap-3">
                  {v.facePhoto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.facePhoto}
                      alt={`Foto de ${v.name}`}
                      className="w-12 h-12 rounded-full object-cover cursor-pointer"
                      onClick={() => setExpandedPhoto(v.facePhoto || null)}
                    />
                  )}
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-lg font-medium text-gray-800 dark:text-white">{v.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600">
                        {v.type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {v.plate} • {new Date(v.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(v)} className="px-3 py-2 border rounded-md text-sm">
                    {t('vehicles.edit') ?? 'Editar'}
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="px-3 py-2 bg-red-600 text-white rounded-md text-sm">
                    {t('vehicles.delete') ?? 'Eliminar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>{vehicles.length} {t('vehicles.total') ?? 'total'}</span>
          <button onClick={() => { setVehicles([]); setMessage(t('vehicles.listCleared') ?? 'Lista vaciada'); }} className="underline">
            {t('vehicles.clearList') ?? 'Limpiar lista'}
          </button>
        </div>
      </div>

      {/* Modal para foto ampliada */}
      {expandedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={() => setExpandedPhoto(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedPhoto}
            alt="Foto ampliada"
            className="max-w-full max-h-[90vh] rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
