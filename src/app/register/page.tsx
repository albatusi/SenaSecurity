'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaUserTag, FaCamera } from 'react-icons/fa';
import Image from 'next/image';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

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
    photo: '', // Guardaremos la foto en base64 o URL
  });

  const [preview, setPreview] = useState<string | null>(null);

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

    if (form.password !== form.confirmPassword) {
      alert(t('register.passwordMismatch'));
      return;
    }

    // Construimos un objeto más limpio para guardar en localStorage (sin confirmPassword)
    const userToSave = {
      name: form.name.trim(),
      document: form.document.trim(),
      role: form.role,
      email: form.email.trim().toLowerCase(),
      password: form.password, // idealmente el back debería hashear esto
      photo: form.photo || null, // base64 o url (o null si no subió)
    };

    // Guardamos en localStorage (ProfilePage leerá user.photo o user.image)
    localStorage.setItem('user', JSON.stringify(userToSave));

    alert(t('register.successMessage'));
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-300 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Columna Izquierda con imagen desde /public */}
        <div className="hidden lg:block lg:w-5/12 relative">
          <Image
            src="/seguridad.webp"
            alt={t('register.imageAlt')}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Columna Derecha con formulario */}
        <div className="w-full lg:w-7/12 p-6 sm:p-10 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="Logo" width={80} height={80} priority />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
            {t('register.title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Subir foto */}
            <div className="flex flex-col items-center">
              <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-full w-32 h-32 overflow-hidden relative">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <FaCamera className="text-gray-500 text-3xl" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">{t('register.uploadPhoto')}</p>
            </div>

            <InputField
              icon={<FaUser />}
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={t('register.namePlaceholder')}
            />
            <InputField
              icon={<FaIdCard />}
              name="document"
              value={form.document}
              onChange={handleChange}
              placeholder={t('register.documentPlaceholder')}
            />

            {/* Selector de rol */}
            <div className="flex items-center gap-3 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 focus-within:ring-2 focus-within:ring-blue-400">
              <FaUserTag className="text-blue-500" />
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-transparent outline-none text-gray-800 dark:text-white"
                required
              >
                <option value="">{t('register.roleSelect')}</option>
                <option value="admin">{t('register.adminRole')}</option>
                <option value="usuario">{t('register.userRole')}</option>
              </select>
            </div>

            <InputField
              icon={<FaEnvelope />}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('register.emailPlaceholder')}
            />
            <InputField
              icon={<FaLock />}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t('register.passwordPlaceholder')}
            />
            <InputField
              icon={<FaLock />}
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder={t('register.confirmPasswordPlaceholder')}
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
              <span
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:underline cursor-pointer"
              >
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
