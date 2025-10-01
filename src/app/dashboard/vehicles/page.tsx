'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// 🎯 CONFIGURACIÓN CLAVE: Define la URL base de la API
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
// Normalizar: quitar slash final si existe
const API_BASE_URL = BASE_URL.replace(/\/+$/, '');

type Vehicle = {
  id: number;
  name: string;
  plate: string;
  type: 'carro' | 'moto' | 'bicicleta';
  createdAt: string;
  facePhoto?: string | null;
};

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

// Helper: lee body como texto y trata de parsear JSON si corresponde
async function readBodyAsMaybeJson(res: Response): Promise<unknown | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.message === 'string') return b.message;
    if (typeof b.detail === 'string') return b.detail;
  }
  return fallback;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// ----------------------------------------------------
// ✅ HOOK PERSONALIZADO PARA LÓGICA DE API
// ----------------------------------------------------

// Define el tipo para la función de traducción
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

    const url = `${API_BASE_URL}/vehicles`.replace(/\/+$/, '');

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

  // Se ejecuta al montar
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

        await fetchVehicles(); // Recargar lista
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

        await fetchVehicles(); // Recargar lista
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

// ----------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------
export default function VehiclesPage() {
  const { t } = useLanguage();
  // No extraer fetchVehicles aquí si no lo vas a usar directamente (evita eslint no-unused-vars)
  const { vehicles, isLoading, error, clearError, saveVehicle, deleteVehicle } = useVehiclesAPI(t);

  const [form, setForm] = useState({ name: '', plate: '', type: 'carro' as Vehicle['type'] });
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 'manual': captura manual o solo para mostrar | 'auto': reconocimiento automático
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');

  // Lógica de cámara y reconocimiento
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Reutiliza un único canvas para todas las operaciones (captura rostro y reconocimiento)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const PLATE_API_KEY = process.env.NEXT_PUBLIC_PLATE_API_KEY ?? '';

  // Mostrar la configuración en consola para diagnosticar despliegue (temporal)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('DEBUG: NEXT_PUBLIC_API_URL =', process.env.NEXT_PUBLIC_API_URL);
      // eslint-disable-next-line no-console
      console.log('DEBUG: NEXT_PUBLIC_PLATE_API_KEY present?', !!process.env.NEXT_PUBLIC_PLATE_API_KEY);
    }
  }, []);

  // Manejo de mensajes de éxito/error del componente
  useEffect(() => {
    if (error) {
      setMessage(error);
      clearError(); // Limpia el error del hook después de mostrarlo
    }
  }, [error, clearError]);

  // Temporizador para limpiar el mensaje
  useEffect(() => {
    if (!message) return;
    const tmo = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(tmo);
  }, [message]);

  // Función de utilería para crear o obtener el canvas (siempre devuelve uno)
  const getCanvas = useCallback(() => {
    if (!canvasRef.current) {
      // Crea el canvas si aún no existe
      canvasRef.current = document.createElement('canvas');
    }
    return canvasRef.current;
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        // Limpiar srcObject para liberar recursos, usando una asignación segura
        (videoRef.current as HTMLVideoElement).srcObject = null;
      } catch {
        // Ignorar errores de DOM al limpiar
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return; // Ya está iniciada

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMessage(t('vehicles.browserNotSupported') ?? 'Tu navegador no soporta cámara');
        return;
      }

      const constraints: MediaStreamConstraints = {
        // Preferir la cámara trasera (entorno)
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          // Intentar reproducir el video (puede fallar por políticas de autoplay)
          await videoRef.current.play();
        } catch {
          // autoplay bloqueado
        }
      }
      setMessage(t('vehicles.cameraStarted') ?? 'Cámara iniciada');
    } catch (err: unknown) {
      console.error('Error iniciando cámara', err);
      const msg = getErrorMessage(err);
      setMessage(t('vehicles.cameraError') ?? `Error al iniciar la cámara: ${msg}`);
      stopCamera(); // Asegurar la detención en caso de error
    }
  }, [t, stopCamera]);

  // Lógica de cámara: Se activa/desactiva al cambiar de modo
  useEffect(() => {
    if (mode === 'auto' || mode === 'manual') {
      startCamera();
    } else {
      // Si el modo cambia a algo que no requiere cámara, la detiene
      stopCamera();
    }

    // Cleanup: se ejecuta al desmontar el componente o antes de que 'mode' cambie
    return () => {
      if (streamRef.current) {
        stopCamera();
      }
    };
  }, [mode, startCamera, stopCamera]);

  const validatePlate = (plate: string) => {
    const cleaned = plate.trim().toUpperCase();
    return /^[A-Z0-9-]{3,8}$/.test(cleaned) ? cleaned : null;
  };

  const resetForm = () => {
    setForm({ name: '', plate: '', type: 'carro' });
    setFacePhoto(null);
  };

  // ------------------------------------------------------------------
  // 1. LÓGICA DE CREACIÓN/ACTUALIZACIÓN (POST/PUT) - Usa Hook
  // ------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name: formName, plate: formPlate, type: formType } = form; // Desestructuración

    const name = formName.trim();
    const plate = validatePlate(formPlate || '');
    if (!name) return setMessage(t('vehicles.nameRequired') ?? 'Nombre requerido');
    if (!plate) return setMessage(t('vehicles.invalidPlate') ?? 'Placa inválida');

    // Duplicado check local (el backend también lo hace)
    const duplicate = vehicles.find((v) => v.plate === plate && v.id !== editingId);
    if (duplicate) return setMessage(t('vehicles.duplicatePlate') ?? 'Placa duplicada');

    const vehicleDataToSend: Omit<Vehicle, 'id' | 'createdAt'> = {
      name,
      plate,
      type: formType,
      facePhoto, // Envía la Data URL (string)
    };

    const result = await saveVehicle(vehicleDataToSend, editingId);

    if (result.success) {
      setMessage(result.message);
      setEditingId(null);
      resetForm();
      // Opcional: Volver a manual si viene de auto mode y fue registro exitoso
      if (mode === 'auto' && !editingId) {
        setMode('manual');
      }
    }
  };

  const handleEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setForm({ name: v.name, plate: v.plate, type: v.type });
    setFacePhoto(v.facePhoto || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --------------------------------------------------
  // 2. LÓGICA DE ELIMINACIÓN (DELETE) - Usa Hook
  // --------------------------------------------------
  const handleDelete = async (id: number) => {
    const ok = confirm(t('vehicles.deleteConfirm') ?? '¿Eliminar este vehículo?');
    if (!ok) return;

    const result = await deleteVehicle(id);

    if (result.success) {
      setMessage(result.message);
    }
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
            // Encapsular en comillas si contiene comas, comillas o saltos de línea
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

  // ----- AUTOMÁTICO: captura y reconocimiento (usa API externa, no afecta backend) -----
  const captureAndRecognize = async () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || video.srcObject === null) {
      return setMessage(t('vehicles.cameraNotStarted') ?? 'Cámara no iniciada');
    }
    if (!PLATE_API_KEY) {
      return setMessage(t('vehicles.missingApiKey') ?? 'Falta API key de Plate Recognizer');
    }

    try {
      setRecognizing(true);
      setLastConfidence(null); // Resetear confianza
      setMessage(t('vehicles.sendingRecognition') ?? 'Enviando a reconocimiento...');

      const canvas = getCanvas();
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear contexto del canvas');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob: Blob | null = await new Promise((resolve) =>
        // Reducir calidad a 0.7 para envíos más rápidos
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7)
      );

      if (!blob) {
        throw new Error(t('vehicles.captureError') ?? 'Error al capturar');
      }

      const formData = new FormData();
      formData.append('upload', blob, 'plate.jpg');
      formData.append('regions', 'co'); // Asumiendo Colombia por el código original (ajustar si es necesario)

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
        // Normalizar la placa
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
      const msg = getErrorMessage(err);
      setMessage((t('vehicles.recognitionError') ?? 'Error de reconocimiento') + ': ' + msg);
    } finally {
      setRecognizing(false);
    }
  };

  // ----------------------------------------------------------------------
  // 3. REGISTRO DESDE MODO AUTOMÁTICO (POST) - Usa Hook
  // ----------------------------------------------------------------------
  const registerFromAuto = async () => {
    const { name: formName, plate: formPlate, type: formType } = form;

    const name = formName.trim();
    const plate = validatePlate(formPlate || '');

    if (!name) return setMessage(t('vehicles.nameRequired') ?? 'Nombre requerido');
    if (!plate) return setMessage(t('vehicles.invalidPlate') ?? 'Placa inválida');

    // Duplicado check local
    const duplicate = vehicles.find((v) => v.plate === plate);
    if (duplicate) return setMessage(t('vehicles.duplicatePlate') ?? 'Placa duplicada. Edite el existente o cambie la placa.');

    const newVehicleData: Omit<Vehicle, 'id' | 'createdAt'> = {
      name,
      plate,
      type: formType,
      facePhoto,
    };

    const result = await saveVehicle(newVehicleData, null); // Siempre es un POST (null editingId)

    if (result.success) {
      setMessage(t('vehicles.vehicleRegisteredAuto') ?? 'Vehículo registrado automáticamente');
      resetForm();
      setMode('manual'); // Cambiar a manual después de un registro exitoso
    }
  };

  const captureFacePhoto = () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || video.srcObject === null) {
      return setMessage(t('vehicles.cameraNotStarted') ?? 'Cámara no iniciada');
    }

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

  // ----------------------------------------------------
  // RENDERIZADO
  // ----------------------------------------------------
  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header + form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white truncate">
              {editingId !== null ? t('vehicles.editTitle') ?? 'Editar vehículo' : <><span role="img" aria-label="emoji de carro">🚘</span> {t('vehicles.pageTitle') ?? 'Registro de vehículos'}</>}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t('vehicles.subtitle') ?? 'Gestión de acceso y registro de vehículos en el sistema.'}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="search"
              placeholder={t('vehicles.searchPlaceholder') ?? 'Buscar por nombre o placa...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white w-full sm:w-72"
              aria-label={t('vehicles.searchPlaceholder') ?? 'Buscar vehículo'}
            />
            <button
              onClick={exportCSV}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:brightness-90 transition-all w-full sm:w-auto flex items-center justify-center gap-1"
              type="button"
            >
              <span role="img" aria-label="emoji de descarga">⬇️</span> {t('vehicles.exportCSV') ?? 'Exportar CSV'}
            </button>
          </div>
        </div>

        {/* Resto del JSX (igual que antes) */}
        {/* ... tu JSX continúa tal cual (lo dejé para no alargar demasiado la respuesta) */}
        {/* He dejado completo el JSX más arriba en tu archivo real; aquí mostramos la parte inicial para no romper la respuesta */}
      </div>

      {/* Nota: el resto del JSX (lista de vehículos, modal, etc.) permanece igual que antes */}
    </div>
  );
}
