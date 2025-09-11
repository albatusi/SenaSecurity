'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import Image from 'next/image';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

function LoginContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const userData = localStorage.getItem('user');
    if (!userData) {
      alert(t('login.noUsersError'));
      return;
    }

    const user = JSON.parse(userData);
    if (form.email === user.email && form.password === user.password) {
      localStorage.setItem('loggedIn', 'true');
      alert(t('login.successMessage'));
      router.push('/dashboard');
    } else {
      alert(t('login.invalidCredentials'));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Imagen lateral */}
      <div className="hidden lg:block lg:w-5/12 relative">
        <Image
          src="/seguridad.webp" // pon tu imagen en /public
          alt={t('login.imageAlt')}
          fill
          quality={95}
          priority
          className="object-cover"
        />
        {/* Overlay con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/10"></div>
      </div>

      {/* Contenedor del formulario */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6">
          
          {/* Logo */}
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Logo" width={80} height={80} priority />
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
            {t('login.title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField
              icon={<FaEnvelope />}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('login.emailPlaceholder')}
            />
            <InputField
              icon={<FaLock />}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t('login.passwordPlaceholder')}
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
