'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaUserTag, FaCamera } from 'react-icons/fa';
import Image from 'next/image';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

type MsgType = 'success' | 'error' | null;

function RegisterContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: '',
    document: '',
    role: '',
    email: '',
    password: '',
    confirmPassword: '',
    photo: '',
  });

  const [preview, setPreview] = useState<string | null>(null);

  // Mensaje inline
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MsgType>(null);

  const showMessage = (text: string, type: MsgType = 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage(null);
      setMessageType(null);
    }, 3500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, photo: reader.result as string }));
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirmPassword || !form.role) {
      showMessage(t('register.fillAllFields') ?? 'Por favor completa todos los campos requeridos.', 'error');
      return;
    }

    if (form.password !== form.confirmPassword) {
      showMessage(t('register.passwordMismatch') ?? 'Las contraseñas no coinciden.', 'error');
      return;
    }

    // Construimos objeto limpio
    const userToSave = {
      name: form.name.trim(),
      document: form.document.trim(),
      role: form.role,
      email: form.email.trim().toLowerCase(),
      password: form.password,
      photo: form.photo || null,
    };

    // Guardar en localStorage
    localStorage.setItem('user', JSON.stringify(userToSave));

    showMessage(t('register.successMessage') ?? 'Registro exitoso', 'success');

    // Redirigir al login tras un pequeño delay para que el usuario vea el mensaje
    setTimeout(() => {
      router.push('/login');
    }, 700);
  };

  return (
    <div className="min-h-screen bg-gray-300 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Inline message */}
        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl px-4 py-2 rounded-md text-sm font-medium ${
              messageType === 'success'
                ? 'bg-green-50 text-green-800 ring-1 ring-green-200'
                : 'bg-red-50 text-red-800 ring-1 ring-red-200'
            }`}
          >
            {message}
          </div>
        )}

        {/* Columna Izquierda con imagen */}
        <div className="hidden lg:block lg:w-5/12 relative">
          <Image src="/seguridad.webp" alt={t('register.imageAlt')} fill className="object-cover" priority />
        </div>

        {/* Columna Derecha con formulario */}
        <div className="w-full lg:w-7/12 p-6 sm:p-10 flex flex-col justify-center">
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="Logo" width={80} height={80} priority />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
            {t('register.title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Foto */}
            <div className="flex flex-col items-center">
              <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-full w-32 h-32 overflow-hidden relative">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <FaCamera className="text-gray-500 text-3xl" />
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              <p className="text-sm text-gray-500 mt-2">{t('register.uploadPhoto')}</p>
            </div>

            <InputField
              icon={<FaUser />}
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={t('register.namePlaceholder') ?? 'Nombre completo'}
            />
            <InputField
              icon={<FaIdCard />}
              name="document"
              value={form.document}
              onChange={handleChange}
              placeholder={t('register.documentPlaceholder') ?? 'Documento'}
            />

            <div className="flex items-center gap-3 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 focus-within:ring-2 focus-within:ring-blue-400">
              <FaUserTag className="text-blue-500" />
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-transparent outline-none text-gray-800 dark:text-white"
                required
                aria-label={t('register.roleSelect') ?? 'Seleccionar rol'}
              >
                <option value="">{t('register.roleSelect') ?? 'Selecciona un rol'}</option>
                <option value="admin">{t('register.adminRole') ?? 'Administrador'}</option>
                <option value="usuario">{t('register.userRole') ?? 'Usuario'}</option>
              </select>
            </div>

            <InputField
              icon={<FaEnvelope />}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('register.emailPlaceholder') ?? 'Correo electrónico'}
            />
            <InputField
              icon={<FaLock />}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t('register.passwordPlaceholder') ?? 'Contraseña'}
            />
            <InputField
              icon={<FaLock />}
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder={t('register.confirmPasswordPlaceholder') ?? 'Confirmar contraseña'}
            />

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-full hover:bg-blue-700 transition font-semibold text-lg shadow-md"
            >
              {t('register.submitButton')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('register.hasAccount')}{' '}
              <span onClick={() => router.push('/login')} className="text-blue-600 hover:underline cursor-pointer">
                {t('register.loginLink')}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <LanguageProvider>
      <RegisterContent />
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
    <div className="flex items-center gap-3 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 focus-within:ring-2 focus-within:ring-blue-400">
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
