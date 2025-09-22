'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import Image from 'next/image';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

type MsgType = 'success' | 'error' | null;

function LoginContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  // Mensaje inline en UI (reemplaza alert)
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MsgType>(null);

  const showMessage = (text: string, type: MsgType = 'error') => {
    setMessage(text);
    setMessageType(type);
    // auto-hide
    setTimeout(() => {
      setMessage(null);
      setMessageType(null);
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const userData = localStorage.getItem('user');
    if (!userData) {
      showMessage(t('login.noUsersError') || 'No hay usuarios registrados.', 'error');
      return;
    }

    let user;
    try {
      user = JSON.parse(userData);
    } catch {
      showMessage(t('login.noUsersError') || 'Error leyendo datos de usuario.', 'error');
      return;
    }

    if (form.email === user.email && form.password === user.password) {
      localStorage.setItem('loggedIn', 'true');
      showMessage(t('login.successMessage') || 'Inicio de sesión correcto', 'success');
      // redirigir sin mostrar JSON ni alert — damos un pequeño delay para que se vea el mensaje
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } else {
      showMessage(t('login.invalidCredentials') || 'Credenciales inválidas', 'error');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Imagen lateral */}
      <div className="hidden lg:block lg:w-5/12 relative">
        <Image
          src="/seguridad.webp"
          alt={t('login.imageAlt')}
          fill
          quality={95}
          priority
          className="object-cover"
        />
        {/* Overlay con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/10" />
      </div>

      {/* Contenedor del formulario */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6 relative">
          {/* Mensaje inline */}
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

          {/* Logo */}
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Logo" width={80} height={80} priority />
          </div>

          {/* Título */}
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
            {t('login.title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <InputField
              icon={<FaEnvelope />}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('login.emailPlaceholder') ?? 'Correo'}
            />
            <InputField
              icon={<FaLock />}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t('login.passwordPlaceholder') ?? 'Contraseña'}
            />

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
            >
              {t('login.submitButton')}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm">
            {t('login.noAccount')}{' '}
            <span
              onClick={() => router.push('/register')}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              {t('login.registerLink')}
            </span>
          </p>
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
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-gray-800 dark:text-white"
        required
      />
    </div>
  );
}
