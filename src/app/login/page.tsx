// src/app/[ruta]/LoginPage.tsx (o donde lo tengas)
'use client';
import Image from 'next/image';
import { useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';

// --- Lógica del Contexto de Idioma Simplificado (para funcionar en un solo archivo) ---
// Define la estructura del contexto
interface LanguageContextType {
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Proveedor de Idioma simplificado que proporciona una función 't'
function LanguageProvider({ children }: { children: React.ReactNode }) {
  const translations: { [key: string]: string } = {
    'login.imageAlt': 'Un hombre con un escudo de seguridad virtual',
    'login.title': 'Iniciar Sesión',
    'login.emailPlaceholder': 'Correo Electrónico',
    'login.passwordPlaceholder': 'Contraseña',
    'login.submitButton': 'Ingresar',
    'login.loading': 'Ingresando...',
    'login.noAccount': '¿No tienes una cuenta?',
    'login.registerLink': 'Regístrate',
    'login.successMessage': '¡Inicio de sesión exitoso!',
    'login.invalidCredentials': 'Credenciales inválidas o error de conexión.',
    'login.2faTitle': 'Verificación de Dos Pasos',
    'login.2faInstructions': 'Ingresa el código de 6 dígitos de tu aplicación de autenticación para continuar.',
    'login.2faCodePlaceholder': 'Código 2FA',
    'login.verifyButton': 'Verificar',
    'login.2faInvalid': 'Código 2FA inválido.',
  };

  const t = (key: string) => translations[key] || key;

  return <LanguageContext.Provider value={{ t }}>{children}</LanguageContext.Provider>;
}

// Hook para usar el contexto de idioma
function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage debe ser utilizado dentro de un LanguageProvider');
  }
  return context;
}

// --- Lógica de la API de Login Simulada (para funcionar en un solo archivo) ---
const API_URL = 'https://backend-x2ed.onrender.com/api';

interface LoginData {
  email: string;
  password: string;
}

// Se añade un tipo de respuesta que puede indicar la necesidad de 2FA
interface LoginResponse {
  message: string;
  token?: string;
  requires2FA?: boolean;
  email?: string;
  user?: {
    nomUsuario: string;
    docUsuario: string;
    emaUsuario: string;
    rol: {
      nomRol: string;
    };
    habilitado2FA?: boolean;
  };
}

interface Verify2FAResponse {
  message: string;
  token: string;
}

async function parseErrorBody(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Función de la API para iniciar sesión
async function loginUser(data: LoginData): Promise<LoginResponse> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorBody = await parseErrorBody(res);
      throw new Error(errorBody?.message || `Error al iniciar sesión (status ${res.status})`);
    }

    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg || 'Error de red al iniciar sesión');
  }
}

// Nueva función para enviar el código 2FA al backend y obtener el token
async function verify2faLogin(email: string, twoFactorCode: string): Promise<Verify2FAResponse> {
  try {
    const res = await fetch(`${API_URL}/auth/verify-login-2fa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, twoFactorCode }),
    });

    if (!res.ok) {
      const errorBody = await parseErrorBody(res);
      throw new Error(errorBody?.message || `Error al verificar el código 2FA (status ${res.status})`);
    }

    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg || 'Error de red al verificar el 2FA');
  }
}

// Tipo para el estado del mensaje de la UI (éxito, error o nulo)
type MsgType = 'success' | 'error' | null;

function LoginContent() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  // --- NUEVOS ESTADOS PARA LA LÓGICA DE 2FA ---
  const [show2FAForm, setShow2FAForm] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [userEmailFor2FA, setUserEmailFor2FA] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MsgType>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const showMessage = (text: string, type: MsgType = 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage(null);
      setMessageType(null);
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Nuevo manejador para el campo de código 2FA
  const handle2FACodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTwoFactorCode(e.target.value);
  };

  // Lógica de envío principal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Normalizamos email al enviar
      const normalizedEmail = (form.email || '').trim().toLowerCase();

      const res = await loginUser({ email: normalizedEmail, password: form.password });

      // --- Lógica Condicional para 2FA ---
      // Si el backend responde que 2FA está habilitado, pasamos a la siguiente fase
      if (res.requires2FA || res.user?.habilitado2FA) {
        setShow2FAForm(true); // Muestra el formulario de 2FA
        // Prioriza email devuelto por backend (si lo incluye), si no usar el normalizado
        setUserEmailFor2FA(res.email ?? normalizedEmail);
        showMessage(t('login.2faInstructions'), 'success');
      } else if (res.token) {
        // Si no hay 2FA, se procede con el login normal
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', res.token);
          if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
        }
        showMessage(t('login.successMessage') || 'Inicio de sesión correcto', 'success');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        showMessage(t('login.invalidCredentials') || 'Credenciales inválidas', 'error');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const text = err instanceof Error ? err.message : String(err);
      showMessage(text || (t('login.invalidCredentials') ?? 'Credenciales inválidas'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para manejar el envío del formulario 2FA
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Normaliza el email que vamos a enviar (por seguridad)
      const normalizedEmail = (userEmailFor2FA || '').trim().toLowerCase();
      const res = await verify2faLogin(normalizedEmail, twoFactorCode);

      // Si la verificación es exitosa, se recibe el token
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', res.token);
      }
      showMessage(t('login.successMessage') || 'Inicio de sesión correcto', 'success');
      setTimeout(() => router.push('/dashboard'), 500);
    } catch (err: unknown) {
      console.error('2FA error:', err);
      const text = err instanceof Error ? err.message : String(err);
      showMessage(text || (t('login.2faInvalid') ?? 'Código 2FA inválido'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    router.push('/register');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="hidden lg:block lg:w-5/12 relative h-screen">
        <div className="absolute inset-0">
          <div className="relative w-full h-full">
            <Image src="/seguridad.webp" alt={t('login.imageAlt')} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/10" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8 w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md overflow-auto max-h-[90vh] relative">
          {message && (
            <div
              role="status"
              aria-live="polite"
              className={`absolute -top-4 left-1/2 transform -translate-x-1/2 w-[90%] px-4 py-2 rounded-md text-sm font-medium ${
                messageType === 'success'
                  ? 'bg-green-50 text-green-800 ring-1 ring-green-200'
                  : 'bg-red-50 text-red-800 ring-1 ring-red-200'
              }`}
              style={{ zIndex: 60 }}
            >
              {message}
            </div>
          )}

          <div className="flex justify-center">
            <Image src="/logo.png" alt="Logo" style={{ width: '80px', height: '80px' }} />
          </div>

          {/* Lógica condicional para mostrar el formulario de login o el de 2FA */}
          {!show2FAForm ? (
            // --- FORMULARIO DE INICIO DE SESIÓN ORIGINAL ---
            <>
              <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">{t('login.title')}</h2>
              <form onSubmit={handleSubmit} className="space-y-5 mt-4" noValidate>
                <InputField
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20" fill="currentColor">
                      <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z" />
                    </svg>
                  }
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={t('login.emailPlaceholder') ?? 'Correo'}
                />
                <InputField
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="20" height="20" fill="currentColor">
                      <path d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z" />
                    </svg>
                  }
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={t('login.passwordPlaceholder') ?? 'Contraseña'}
                />
                <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md">
                  {loading ? (t('login.loading') ?? 'Ingresando...') : (t('login.submitButton') ?? 'Ingresar')}
                </button>
              </form>
              <p className="text-center text-gray-500 text-sm mt-3">
                {t('login.noAccount')}{' '}
                <span onClick={handleRegisterClick} className="text-blue-600 hover:underline cursor-pointer">
                  {t('login.registerLink')}
                </span>
              </p>
            </>
          ) : (
            // --- FORMULARIO DE VERIFICACIÓN 2FA ---
            <div className="text-center w-full max-w-sm mx-auto">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{t('login.2faTitle')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{t('login.2faInstructions')}</p>
              <form onSubmit={handle2FASubmit} className="space-y-5">
                <InputField
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="20" height="20" fill="currentColor">
                      <path d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z" />
                    </svg>
                  }
                  name="twoFactorCode"
                  type="text"
                  value={twoFactorCode}
                  onChange={handle2FACodeChange}
                  placeholder={t('login.2faCodePlaceholder') ?? 'Código 2FA'}
                />
                <button disabled={loading} type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold shadow-md">
                  {loading ? (t('login.loading') ?? 'Verificando...') : (t('login.verifyButton') ?? 'Verificar')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LanguageProvider>
      <LoginContent />
    </LanguageProvider>
  );
}

interface InputFieldProps {
  icon: React.ReactNode;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
}

function InputField({ icon, name, value, onChange, placeholder, type = 'text' }: InputFieldProps) {
  return (
    <div className="flex items-center gap-3 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 focus-within:ring-2 focus-within:ring-blue-400">
      <div className="text-blue-500">{icon}</div>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-transparent outline-none text-gray-800 dark:text-white" required />
    </div>
  );
}
