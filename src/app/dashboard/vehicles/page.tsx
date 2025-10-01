'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// Lee NEXT_PUBLIC_API_URL y asegura que termine en /api (sin doble slash)
const RAW_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
const API_BASE_URL = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE}/api`;

type Vehicle = {
  id: number;
  name: string;
  plate: string;
  type: 'carro' | 'moto' | 'bicicleta';
  createdAt: string;
  facePhoto?: string | null;
};

interface PlateResult {
  plate?: string;
  score?: number;
  confidence?: number;
}

interface PlateRecognizerResponse {
  results?: PlateResult[];
}

async function readBodyAsMaybeJson(res: Response): Promise<unknown | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(body: unknown, fallback: string) {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.message === 'string') return b.message;
    if (typeof b.detail === 'string') return b.detail;
  }
  return fallback;
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Hook para API
type TranslateFunction = (key: string) => string | undefined;

const useVehiclesAPI = (t: TranslateFunction) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchVehicles = useCallback(async () => {
    if (!API_BASE_URL) {
      setError('Error: URL del servidor (NEXT_PUBLIC_API_URL) no configurada.');
      setIsLoading(false);
      return;
    }

    const url = `${API_BASE_URL}/vehicles`;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      const parsed = await readBodyAsMaybeJson(response);

      if (!response.ok) {
        const message = extractMessage(parsed, `Error ${response.status}: Fallo al cargar vehículos`);
        throw new Error(message);
      }

      const data: Vehicle[] = Array.isArray(parsed) ? parsed : [];
      setVehicles(data);
    } catch (err: unknown) {
      console.error('Error fetching vehicles:', err);
      setError(t('vehicles.loadError') ?? `Error al cargar vehículos: ${getErrorMessage(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const saveVehicle = useCallback(
    async (vehicle: Omit<Vehicle, 'id' | 'createdAt'>, editingId: number | null) => {
      const isEditing = editingId !== null;
      const apiUrl = isEditing ? `${API_BASE_URL}/vehicles/${editingId}` : `${API_BASE_URL}/vehicles`;

      setError(null);
      try {
        const res = await fetch(apiUrl, {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vehicle),
        });

        const parsed = await readBodyAsMaybeJson(res);

        if (!res.ok) {
          const message = extractMessage(parsed, `Error ${res.status}: Fallo al guardar`);
          throw new Error(message);
        }

        await fetchVehicles();
        return {
          success: true,
          message: isEditing
            ? t('vehicles.vehicleUpdated') ?? 'Vehículo actualizado'
            : t('vehicles.vehicleRegistered') ?? 'Vehículo registrado',
        };
      } catch (err: unknown) {
        console.error('Error saving vehicle:', err);
        const errorMessage = `Error al guardar: ${getErrorMessage(err)}`;
        setError(errorMessage);
        return { success: false, message: errorMessage };
      }
    },
    [fetchVehicles, t]
  );

  const deleteVehicle = useCallback(
    async (id: number) => {
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
          method: 'DELETE',
        });

        const parsed = await readBodyAsMaybeJson(res);

        if (!res.ok) {
          const message = extractMessage(parsed, `Error ${res.status}: Fallo al eliminar`);
          throw new Error(message);
        }

        await fetchVehicles();
        return { success: true, message: t('vehicles.vehicleDeleted') ?? 'Vehículo eliminado' };
      } catch (err: unknown) {
        console.error('Error deleting vehicle:', err);
        const errorMessage = `Error al eliminar: ${getErrorMessage(err)}`;
        setError(errorMessage);
        return { success: false, message: errorMessage };
      }
    },
    [fetchVehicles, t]
  );

  return { vehicles, isLoading, error, clearError, fetchVehicles, saveVehicle, deleteVehicle };
};

// Componente
export default function VehiclesPage() {
  const { t } = useLanguage();
  const { vehicles, isLoading, error, clearError, fetchVehicles, saveVehicle, deleteVehicle } = useVehiclesAPI(t);

  const [form, setForm] = useState({ name: '', plate: '', type: 'carro' as Vehicle['type'] });
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<'manual' | 'auto'>('manual');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const PLATE_API_KEY = process.env.NEXT_PUBLIC_PLATE_API_KEY ?? '';

  useEffect(() => {
    if (error) {
      setMessage(error);
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (!message) return;
    const tmo = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(tmo);
  }, [message]);

  const getCanvas = useCallback(() => {
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    return canvasRef.current;
  }, []);

  // ---------------------- stopCamera (reemplazada) ----------------------
  const stopCamera = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
        try {
          (videoRef.current as HTMLVideoElement).srcObject = null;
        } catch {}
      }
    } finally {
      setCameraStarted(false);
    }
  }, []);
  // --------------------------------------------------------------------

  // ---------------------- startCamera (reemplazada) ---------------------
  const startCamera = useCallback(async () => {
    // No iniciar si ya existe stream
    if (streamRef.current) {
      setCameraStarted(true);
      return;
    }

    // Validación mínima
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMessage(t('vehicles.browserNotSupported') ?? 'Tu navegador no soporta cámara');
      return;
    }

    const preferredConstraints: MediaStreamConstraints = {
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    };
    const fallbackConstraints: MediaStreamConstraints = { video: true, audio: false };

    const handleGetUserMediaError = (err: unknown) => {
      console.error('Error iniciando cámara', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMessage(t('vehicles.cameraError') ?? 'Permiso denegado para la cámara. Revisa la configuración del sitio y permite la cámara.');
          return;
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setMessage(t('vehicles.cameraNotFound') ?? 'No se encontró dispositivo de cámara. Conecta una cámara e inténtalo de nuevo.');
          return;
        }
        if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setMessage(t('vehicles.cameraInUse') ?? 'No se puede acceder a la cámara (posiblemente en uso por otra aplicación).');
          return;
        }
      }
      setMessage(t('vehicles.cameraError') ?? `No se pudo acceder a la cámara (revisa permisos): ${getErrorMessage(err)}`);
    };

    // Intento 1: constraints preferentes
    try {
      const stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      streamRef.current = stream;
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = stream;
        } catch {}
        try {
          await videoRef.current.play().catch(() => {});
        } catch {}
      }
      setCameraStarted(true);
      setMessage(t('vehicles.cameraStarted') ?? 'Cámara iniciada');
      return;
    } catch (err: unknown) {
      // Si es por constraints (p. ej. resolución no soportada), intentamos fallback
      const name = (err instanceof DOMException && err.name) ? err.name : null;
      if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError' || name === 'NotReadableError') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          streamRef.current = stream;
          if (videoRef.current) {
            try {
              videoRef.current.srcObject = stream;
            } catch {}
            try {
              await videoRef.current.play().catch(() => {});
            } catch {}
          }
          setCameraStarted(true);
          setMessage(t('vehicles.cameraStarted') ?? 'Cámara iniciada');
          return;
        } catch (err2: unknown) {
          handleGetUserMediaError(err2);
          stopCamera();
          return;
        }
      }

      // Otros errores (permiso, no encontrado, etc.)
      handleGetUserMediaError(err);
      stopCamera();
      return;
    }
  }, [t, stopCamera]);
  // --------------------------------------------------------------------

  // No iniciamos la cámara automáticamente. Solo limpiamos al desmontar.
  useEffect(() => {
    return () => {
      if (streamRef.current) stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validatePlate = (plate: string) => {
    const cleaned = plate.trim().toUpperCase();
    return /^[A-Z0-9-]{3,8}$/.test(cleaned) ? cleaned : null;
  };

  const resetForm = () => {
    setForm({ name: '', plate: '', type: 'carro' });
    setFacePhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const plate = validatePlate(form.plate || '');
    if (!name) return setMessage(t('vehicles.nameRequired') ?? 'Nombre requerido');
    if (!plate) return setMessage(t('vehicles.invalidPlate') ?? 'Placa inválida');

    const duplicate = vehicles.find((v) => v.plate === plate && v.id !== editingId);
    if (duplicate) return setMessage(t('vehicles.duplicatePlate') ?? 'Placa duplicada');

    const vehicleData: Omit<Vehicle, 'id' | 'createdAt'> = { name, plate, type: form.type, facePhoto };

    const result = await saveVehicle(vehicleData, editingId);
    if (result.success) {
      setMessage(result.message);
      setEditingId(null);
      resetForm();
      if (mode === 'auto' && !editingId) setMode('manual');
    }
  };

  const handleEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setForm({ name: v.name, plate: v.plate, type: v.type });
    setFacePhoto(v.facePhoto || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    const ok = confirm(t('vehicles.deleteConfirm') ?? '¿Eliminar este vehículo?');
    if (!ok) return;
    const result = await deleteVehicle(id);
    if (result.success) setMessage(result.message);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.type.includes(q));
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

  const captureAndRecognize = async () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) {
      return setMessage(t('vehicles.cameraNotStarted') ?? 'Cámara no iniciada');
    }
    if (!PLATE_API_KEY) return setMessage(t('vehicles.missingApiKey') ?? 'Falta API key');

    try {
      setRecognizing(true);
      setLastConfidence(null);
      setMessage(t('vehicles.sendingRecognition') ?? 'Enviando a reconocimiento...');

      const canvas = getCanvas();
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear contexto del canvas');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7));
      if (!blob) throw new Error(t('vehicles.captureError') ?? 'Error al capturar');

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
        const errJson = await readBodyAsMaybeJson(res);
        const errMessage = extractMessage(errJson, res.statusText || `HTTP ${res.status}`);
        throw new Error(`API error ${res.status}: ${errMessage}`);
      }

      const data = (await res.json()) as PlateRecognizerResponse;

      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        const plateDetected = (r.plate || '').toString().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        const confidence = (r.score ?? r.confidence) ?? null;
        if (validatePlate(plateDetected)) {
          setForm((prev) => ({ ...prev, plate: plateDetected }));
          setLastConfidence(confidence ?? null);
          setMessage(`${t('vehicles.plateDetected') ?? 'Placa detectada'}: ${plateDetected}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setMessage(t('vehicles.plateInvalid') ?? 'Placa detectada pero no válida');
        }
      } else {
        setMessage(t('vehicles.noPlateDetected') ?? 'No se detectó placa');
      }
    } catch (err: unknown) {
      console.error('Error reconocimiento:', err);
      setMessage((t('vehicles.recognitionError') ?? 'Error de reconocimiento') + ': ' + getErrorMessage(err));
    } finally {
      setRecognizing(false);
    }
  };

  const registerFromAuto = async () => {
    const name = form.name.trim();
    const plate = validatePlate(form.plate || '');

    if (!name) return setMessage(t('vehicles.nameRequired') ?? 'Nombre requerido');
    if (!plate) return setMessage(t('vehicles.invalidPlate') ?? 'Placa inválida');

    const duplicate = vehicles.find((v) => v.plate === plate);
    if (duplicate) return setMessage(t('vehicles.duplicatePlate') ?? 'Placa duplicada');

    const newVehicleData: Omit<Vehicle, 'id' | 'createdAt'> = { name, plate, type: form.type, facePhoto };

    const result = await saveVehicle(newVehicleData, null);
    if (result.success) {
      setMessage(t('vehicles.vehicleRegisteredAuto') ?? 'Vehículo registrado automáticamente');
      resetForm();
      setMode('manual');
    }
  };

  const captureFacePhoto = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return setMessage(t('vehicles.cameraNotStarted') ?? 'Cámara no iniciada');

    const canvas = getCanvas();
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
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white truncate">
              {editingId !== null ? t('vehicles.editTitle') ?? 'Editar vehículo' : <><span role="img" aria-label="car">🚘</span> {t('vehicles.pageTitle') ?? 'Registro de vehículos'}</>}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t('vehicles.subtitle') ?? 'Gestión de acceso y registro de vehículos en el sistema.'}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
            <input
              type="search"
              placeholder={t('vehicles.searchPlaceholder') ?? 'Buscar por nombre o placa...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white w-full sm:w-72"
              aria-label="Buscar vehículo"
            />
            <div className="flex gap-2">
              <button onClick={exportCSV} className="px-3 py-2 bg-green-600 text-white rounded-md hover:brightness-90 w-full sm:w-auto" type="button">
                {t('vehicles.exportCSV') ?? 'Exportar CSV'}
              </button>
              <button onClick={() => fetchVehicles()} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md" type="button">
                {t('vehicles.refresh') ?? 'Refrescar'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setMode('manual'); setLastConfidence(null); }}
            className={`px-4 py-2 rounded-md ${mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
          >
            {t('vehicles.manualMode') ?? 'Manual'}
          </button>
          <button
            type="button"
            onClick={() => { setMode('auto'); setLastConfidence(null); }}
            className={`px-4 py-2 rounded-md ${mode === 'auto' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
            disabled={!PLATE_API_KEY}
            title={!PLATE_API_KEY ? 'Requiere NEXT_PUBLIC_PLATE_API_KEY' : undefined}
          >
            {t('vehicles.autoMode') ?? 'Automático'}
          </button>

          {/* Iniciar / Detener cámara explícito */}
          <div className="flex items-center gap-2 ml-2">
            {!cameraStarted ? (
              <button type="button" onClick={() => startCamera()} className="px-3 py-2 bg-yellow-500 text-white rounded-md hover:brightness-90">
                {t('vehicles.startCamera') ?? 'Iniciar cámara'}
              </button>
            ) : (
              <button type="button" onClick={() => stopCamera()} className="px-3 py-2 bg-red-500 text-white rounded-md hover:brightness-90">
                {t('vehicles.stopCamera') ?? 'Detener cámara'}
              </button>
            )}
          </div>
          {!PLATE_API_KEY && <div className="text-red-500 text-sm flex items-center ml-2">🚨 Falta API Key</div>}
        </div>

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
              onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
              required
              maxLength={8}
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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={facePhoto} alt="Foto rostro" className="w-24 h-24 rounded-full object-cover border border-gray-300 dark:border-gray-600" onClick={() => setExpandedPhoto(facePhoto)} />
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

        {message && <div className={`mt-3 text-sm text-gray-700 dark:text-gray-200 break-words ${message.startsWith('Error') ? 'bg-red-50 p-2 rounded' : 'bg-green-50 p-2 rounded'}`}>{message}</div>}

        {mode === 'manual' && (
          <div className="mt-4 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg max-w-4xl mx-auto">
            <video ref={videoRef} className="w-full h-[180px] sm:h-48 md:h-64 lg:h-80 object-cover rounded" autoPlay muted playsInline />
          </div>
        )}

        {mode === 'auto' && (
          <div className="mt-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <div className="relative">
                <video ref={videoRef} id="video" className="w-full h-[180px] sm:h-48 md:h-64 lg:h-80 object-cover rounded" autoPlay muted playsInline />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-11/12 sm:w-3/4 lg:w-1/2 h-16 sm:h-20 border-2 border-white/60 rounded-lg"></div>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={captureAndRecognize} disabled={recognizing || !PLATE_API_KEY} className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60">
                  {recognizing ? t('vehicles.processing') ?? 'Procesando...' : t('vehicles.captureAndRecognize') ?? 'Capturar y reconocer'}
                </button>

                <button type="button" onClick={() => { stopCamera(); setMode('manual'); }} className="w-full sm:w-auto px-4 py-2 border rounded-md">
                  {t('vehicles.stopCamera') ?? 'Detener cámara'}
                </button>

                {lastConfidence !== null && <div className="ml-auto text-sm text-gray-600 dark:text-gray-300">{t('vehicles.confidence') ?? 'Confianza'}: {(lastConfidence * 100).toFixed(1)}%</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">🧡 {t('vehicles.registeredList') ?? 'Vehículos registrados'} ({vehicles.length})</h3>

        {isLoading ? (
          <p className="text-blue-600 dark:text-blue-400 text-center py-4">{t('vehicles.loading') ?? 'Cargando vehículos...'}</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('vehicles.noMatches') ?? 'No hay coincidencias'}</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((v) => (
              <li key={v.id} className="p-4 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-white to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {v.facePhoto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.facePhoto} alt={`Foto de ${v.name}`} className="w-12 h-12 rounded-full object-cover cursor-pointer" onClick={() => setExpandedPhoto(v.facePhoto || null)} />
                  )}
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-lg font-medium text-gray-800 dark:text-white">{v.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600">{v.type}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 break-words">{v.plate} • {new Date(v.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                  <button onClick={() => handleEdit(v)} className="px-3 py-2 border rounded-md text-sm">{t('vehicles.edit') ?? 'Editar'}</button>
                  <button onClick={() => handleDelete(v.id)} className="px-3 py-2 bg-red-600 text-white rounded-md text-sm">{t('vehicles.delete') ?? 'Eliminar'}</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>{t('vehicles.showing') ?? 'Mostrando'} {filtered.length} {t('vehicles.of') ?? 'de'} {vehicles.length} {t('vehicles.total') ?? 'total'}</span>
        </div>
      </div>

      {expandedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={() => setExpandedPhoto(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={expandedPhoto} alt="Foto ampliada" className="max-w-full max-h-[90vh] rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
