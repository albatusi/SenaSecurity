'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// 🎯 CONFIGURACIÓN CLAVE: Define la URL base de la API
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
// Normalizar: quitar '/api' al final y luego quitar cualquier slash final
const API_BASE_URL = BASE_URL.replace(/\/+$/, '');
const url = `${API_BASE_URL}/vehicles`; 

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
async function readBodyAsMaybeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
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
      setError("Error: URL del servidor (NEXT_PUBLIC_API_URL) no configurada.");
      setIsLoading(false);
      return;
    }

    const url = `${API_BASE_URL}/vehicles`.replace(/\/+$/, ''); // asegurar sin doble slash

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url);

      const parsed = await readBodyAsMaybeJson(response);
      
      if (!response.ok) {
        // Extraer mensaje de error del cuerpo si está disponible, sino usar uno genérico
        const message = parsed && typeof parsed === 'object' && (parsed as any).message
          ? (parsed as any).message
          : (typeof parsed === 'string' ? parsed : `Error ${response.status}: Fallo al cargar vehículos`);
        throw new Error(message);
      }

      const data: Vehicle[] = Array.isArray(parsed) ? parsed : [];
      setVehicles(data);
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(t('vehicles.loadError') ?? `Error al cargar vehículos: ${err?.message ?? String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Se ejecuta al montar
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const saveVehicle = useCallback(async (vehicle: Omit<Vehicle, 'id' | 'createdAt'>, editingId: number | null) => {
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
        const message = parsed && typeof parsed === 'object' && (parsed as any).message
          ? (parsed as any).message
          : (typeof parsed === 'string' ? parsed : `Error ${res.status}: Fallo al guardar`);
        throw new Error(message);
      }

      await fetchVehicles(); // Recargar lista
      return {
        success: true,
        message: isEditing
          ? t('vehicles.vehicleUpdated') ?? 'Vehículo actualizado'
          : t('vehicles.vehicleRegistered') ?? 'Vehículo registrado',
      };
    } catch (err: any) {
      console.error('Error saving vehicle:', err);
      const errorMessage = `Error al guardar: ${err?.message ?? String(err)}`;
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [fetchVehicles, t]);

  const deleteVehicle = useCallback(async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
        method: 'DELETE',
      });

      const parsed = await readBodyAsMaybeJson(res);
      
      if (!res.ok) {
        const message = parsed && typeof parsed === 'object' && (parsed as any).message
          ? (parsed as any).message
          : (typeof parsed === 'string' ? parsed : `Error ${res.status}: Fallo al eliminar`);
        throw new Error(message);
      }

      await fetchVehicles(); // Recargar lista
      return { success: true, message: t('vehicles.vehicleDeleted') ?? 'Vehículo eliminado' };
    } catch (err: any) {
      console.error('Error deleting vehicle:', err);
      const errorMessage = `Error al eliminar: ${err?.message ?? String(err)}`;
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [fetchVehicles, t]);

  return { vehicles, isLoading, error, clearError, fetchVehicles, saveVehicle, deleteVehicle };
};

// ----------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------
export default function VehiclesPage() {
  const { t } = useLanguage();
  const { vehicles, isLoading, error, clearError, fetchVehicles, saveVehicle, deleteVehicle } = useVehiclesAPI(t);

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
      } catch (err) {
        // Ignorar errores de DOM al limpiar
        // console.warn('Error al limpiar video srcObject', err);
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
          // console.warn('Autoplay bloqueado');
        }
      }
      setMessage(t('vehicles.cameraStarted') ?? 'Cámara iniciada');
    } catch (err: unknown) {
      console.error('Error iniciando cámara', err);
      const msg = err instanceof Error ? err.message : String(err);
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
        // Si el stream existe y estamos saliendo del componente, detenlo
        if (streamRef.current) {
            stopCamera();
        }
    };

  // Importante: startCamera y stopCamera son estables (useCallback)
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
    // El error ya está manejado en el hook y se propaga a 'message'
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

      const blob: Blob | null = await new Promise((resolve: (b: Blob | null) => void) =>
        // Reducir calidad a 0.7 para envíos más rápidos
        canvas.toBlob((b: Blob | null) => resolve(b), 'image/jpeg', 0.7) 
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
        const errMessage = typeof errJson === 'object' && errJson !== null && 'detail' in errJson ? (errJson as any).detail : res.statusText;
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
      const msg = err instanceof Error ? err.message : String(err);
      setMessage((t('vehicles.recognitionError') ?? 'Error de reconocimiento') + ': ' + msg);
    } finally {
      setRecognizing(false);
    }
  };

  // ----------------------------------------------------------------------
  // 3. REGISTRO DESDE MODO AUTOMÁTICO (POST) - Usa Hook
  // ----------------------------------------------------------------------
  const registerFromAuto = async () => {
    // Reutilizamos la lógica de validación y guardado del handler principal,
    // pero asegurando que es un registro nuevo (editingId = null).
    // Usamos un objeto de evento ficticio ya que handleSubmit espera uno.
    const e = { preventDefault: () => {} } as React.FormEvent; 
    
    // Temporalmente, podemos forzar el editingId a null antes de llamar a handleSubmit si lo necesitamos, 
    // pero como registerFromAuto es llamado con un botón específico para registro,
    // es más limpio replicar la lógica clave para evitar un formulario intermedio.

    const { name: formName, plate: formPlate, type: formType } = form; // Desestructuración

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
    // El error es manejado por el hook
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

        {/* Botones de modo */}
        <div className="flex gap-2 mb-4 border-b pb-4 dark:border-gray-700">
          <button
            type="button"
            onClick={() => { setMode('manual'); setLastConfidence(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            aria-pressed={mode === 'manual'}
          >
            {t('vehicles.manualMode') ?? 'Manual'}
          </button>
          <button
            type="button"
            onClick={() => { setMode('auto'); setLastConfidence(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'auto' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            aria-pressed={mode === 'auto'}
            disabled={!PLATE_API_KEY}
            title={!PLATE_API_KEY ? 'Requiere NEXT_PUBLIC_PLATE_API_KEY' : undefined}
          >
            {t('vehicles.autoMode') ?? 'Automático'}
          </button>
          {!PLATE_API_KEY && <span className="text-red-500 text-sm flex items-center">🚨 Falta API Key</span>}
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
              aria-label={t('vehicles.ownerPlaceholder') ?? 'Nombre del propietario'}
            />
            <input
              type="text"
              placeholder={t('vehicles.platePlaceholder') ?? 'Placa'}
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} // Limpiar caracteres no permitidos
              required
              maxLength={8}
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              aria-label={t('vehicles.platePlaceholder') ?? 'Placa'}
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Vehicle['type'] })}
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              aria-label={t('vehicles.typeLabel') ?? 'Tipo de vehículo'}
            >
              <option value="carro">{t('vehicles.typeCar') ?? 'Carro'}</option>
              <option value="moto">{t('vehicles.typeMotorcycle') ?? 'Moto'}</option>
              <option value="bicicleta">{t('vehicles.typeBicycle') ?? 'Bicicleta'}</option>
            </select>

            <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-4 mt-2">
              {facePhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                    src={facePhoto} 
                    alt={t('vehicles.facePhotoAlt') ?? "Foto de rostro capturada"} 
                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 dark:border-blue-400" 
                    onClick={() => setExpandedPhoto(facePhoto)}
                />
              )}

              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    type="button" 
                    onClick={captureFacePhoto} 
                    className="px-4 py-2 border rounded-md w-full sm:w-auto bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                >
                  <span role="img" aria-label="emoji de cámara">📸</span> {t('vehicles.captureFace') ?? 'Capturar rostro'}
                </button>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col sm:flex-row gap-2 mt-2">
              {mode === 'auto' ? (
                <>
                  <button 
                    type="button" 
                    onClick={registerFromAuto} 
                    className="w-full sm:flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    {t('vehicles.registerAuto') ?? 'Registrar (auto)'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMode('manual')} 
                    className="w-full sm:w-auto px-4 py-3 border rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('vehicles.changeToManual') ?? 'Cambiar a manual'}
                  </button>
                </>
              ) : (
                <>
                  <button type="submit" className="w-full sm:flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    {editingId !== null ? t('vehicles.saveChanges') ?? 'Guardar cambios' : t('vehicles.register') ?? 'Registrar'}
                  </button>
                  {editingId !== null && (
                    <button type="button" onClick={cancelEdit} className="w-full sm:w-auto px-4 py-3 border rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      {t('vehicles.cancel') ?? 'Cancelar'}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        )}

        {message && <div className={`mt-3 text-sm p-3 rounded-lg ${message.startsWith('Error') || message.startsWith('🚨') ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'} break-words`}>{message}</div>}

        {/* Video preview / Captura */}
        {(mode === 'manual' || mode === 'auto') && (
            <div className="mt-4 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg max-w-4xl mx-auto">
                <div className="relative">
                    <video
                        ref={videoRef}
                        className="w-full h-[180px] sm:h-48 md:h-64 lg:h-80 object-cover rounded"
                        autoPlay
                        muted
                        playsInline
                        id="video-stream"
                        aria-label={t('vehicles.cameraVideoFeed') ?? 'Video de la cámara para captura de placa y rostro'}
                    />
                    
                    {/* Overlay de guía en modo auto */}
                    {mode === 'auto' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-11/12 sm:w-3/4 lg:w-1/2 h-16 sm:h-20 border-4 border-yellow-400/80 rounded-lg shadow-xl animate-pulse"></div>
                        </div>
                    )}
                </div>

                {/* Controles de modo automático */}
                {mode === 'auto' && (
                    <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
                        <button
                            type="button"
                            onClick={captureAndRecognize}
                            disabled={recognizing || !PLATE_API_KEY}
                            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
                        >
                            {recognizing ? t('vehicles.processing') ?? 'Procesando...' : <><span role="img" aria-label="emoji de escaneo">🔍</span> {t('vehicles.captureAndRecognize') ?? 'Capturar y reconocer placa'}</>}
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => { stopCamera(); setMode('manual'); }}
                            className="w-full sm:w-auto px-4 py-2 border rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            <span role="img" aria-label="emoji de stop">🛑</span> {t('vehicles.stopCamera') ?? 'Detener cámara'}
                        </button>

                        {lastConfidence !== null && (
                            <div className="ml-0 sm:ml-auto text-sm font-semibold text-gray-700 dark:text-gray-300 p-2 bg-white dark:bg-gray-900 rounded-md">
                                {t('vehicles.confidence') ?? 'Confianza'}: {(lastConfidence * 100).toFixed(1)}%
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Lista de vehículos registrada */}
      {/* --- */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          <span role="img" aria-label="emoji de corazón naranja">🧡</span> {t('vehicles.registeredList') ?? 'Vehículos registrados'} ({vehicles.length})
        </h2>

        {/* Mostrar estado de carga */}
        {isLoading ? (
          <p className="text-blue-600 dark:text-blue-400 text-center py-4">{t('vehicles.loading') ?? 'Cargando vehículos...'}</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('vehicles.noMatches') ?? 'No hay coincidencias'}</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((v) => (
              <li key={v.id} className={`p-4 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between transition-shadow ${editingId === v.id ? 'shadow-lg ring-2 ring-blue-500/50' : 'shadow-md'} bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20`}>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {v.facePhoto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.facePhoto}
                      alt={t('vehicles.facePhotoFor') ?? `Foto de rostro de ${v.name}`}
                      className="w-12 h-12 rounded-full object-cover cursor-pointer border-2 border-transparent hover:border-blue-500 transition-colors"
                      onClick={() => setExpandedPhoto(v.facePhoto || null)}
                    />
                  )}
                  <div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-lg font-medium text-gray-800 dark:text-white">{v.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-medium">
                        {v.type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 break-words font-mono">
                      <span className="font-bold text-base">{v.plate}</span> • <span className="text-xs">{new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 sm:mt-0 ml-auto sm:ml-0">
                  <button onClick={() => handleEdit(v)} className="px-3 py-1 border rounded-md text-sm text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors">
                    {t('vehicles.edit') ?? 'Editar'}
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors">
                    {t('vehicles.delete') ?? 'Eliminar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>{t('vehicles.showing') ?? 'Mostrando'} {filtered.length} {t('vehicles.of') ?? 'de'} {vehicles.length} {t('vehicles.total') ?? 'total'}</span>
        </div>
      </div>

      {/* Modal para foto ampliada */}
      {expandedPhoto && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 transition-opacity duration-300" 
            onClick={() => setExpandedPhoto(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t('vehicles.expandedPhotoModal') ?? 'Foto de rostro ampliada'}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedPhoto}
            alt={t('vehicles.expandedPhotoAlt') ?? "Foto ampliada"}
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl transform scale-100 transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}