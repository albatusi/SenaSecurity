// src/app/[ruta]/RegisterPage.tsx (o donde lo tengas)
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaUserTag, FaCamera } from 'react-icons/fa';
import Image from 'next/image';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { registerUser, verify2fa } from '../../../lib/api'; // Importa la nueva función

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
    });

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<MsgType>(null);
    const [loading, setLoading] = useState(false);

    // --- Nuevos estados para el 2FA ---
    const [show2FAForm, setShow2FAForm] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');

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

    // Nuevo handleChange para el input del código 2FA
    const handle2FACodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTwoFactorCode(e.target.value);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) {
            showMessage(t('register.passwordMismatch') ?? 'Las contraseñas no coinciden.', 'error');
            return;
        }

        const roleId = form.role === 'admin' ? 1 : 2;

        const formData = new FormData();
        formData.append('name', form.name.trim());
        formData.append('document', form.document.trim());
        formData.append('role', roleId.toString());
        // Normalizamos email
        const normalizedEmail = (form.email || '').trim().toLowerCase();
        formData.append('email', normalizedEmail);
        formData.append('password', form.password);
        if (photoFile) {
            formData.append('profilePhoto', photoFile);
        }

        setLoading(true);
        try {
            const res = await registerUser(formData);

            // Si el backend devuelve una URL de QR, entramos en el flujo de 2FA
            if (res.qrCodeDataUrl) {
                setQrCodeDataUrl(res.qrCodeDataUrl);
                setShow2FAForm(true); // Muestra el formulario de 2FA
                showMessage(res.message ?? 'Registro exitoso. Escanea el código QR.', 'success');
            } else {
                // Si no hay 2FA (caso de respaldo), se completa el registro y se redirige
                if (typeof window !== 'undefined') {
                    if (res.token) localStorage.setItem('token', res.token);
                    if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
                }
                showMessage(res.message ?? (t('register.successMessage') ?? 'Registro exitoso'), 'success');
                setTimeout(() => router.push('/login'), 700);
            }
        } catch (err: unknown) {
            console.error('Registro error:', err);
            const text = err instanceof Error ? err.message : String(err);
            showMessage(text || 'Error al registrar usuario', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Función para manejar la verificación del código 2FA
    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Normaliza email al verificar 2FA también
            const normalizedEmail = (form.email || '').trim().toLowerCase();
            await verify2fa(normalizedEmail, twoFactorCode);

            showMessage(t('register.2faSuccess') ?? '2FA activado exitosamente.', 'success');
            // Redirige al login después de la verificación exitosa
            setTimeout(() => router.push('/login'), 1500);
        } catch (err: unknown) {
            console.error('Verificación 2FA error:', err);
            const text = err instanceof Error ? err.message : String(err);
            showMessage(text || 'Código 2FA inválido. Inténtalo de nuevo.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-300 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full flex flex-col lg:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh]">
                {message && (
                    <div
                        role="status"
                        aria-live="polite"
                        className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl px-4 py-2 rounded-md text-sm font-medium ${messageType === 'success' ? 'bg-green-50 text-green-800 ring-1 ring-green-200' : 'bg-red-50 text-red-800 ring-1 ring-red-200'
                            }`}
                    >
                        {message}
                    </div>
                )}

                <div className="hidden lg:block lg:w-5/12 relative">
                    <Image src="/seguridad.webp" alt={t('register.imageAlt')} fill className="object-cover" priority />
                </div>

                <div className="w-full lg:w-7/12 p-6 sm:p-10 flex flex-col items-center overflow-auto">
                    <div className="flex justify-center mb-6">
                        <Image src="/logo.png" alt="Logo" width={80} height={80} priority />
                    </div>

                    {/* Lógica de renderizado condicional */}
                    {!show2FAForm ? (
                        // --- Formulario de Registro original ---
                        <>
                            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
                                {t('register.title')}
                            </h2>
                            <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-5" noValidate>
                                <div className="flex flex-col items-center mb-6">
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

                                <InputField icon={<FaUser />} name="name" value={form.name} onChange={handleChange} placeholder={t('register.namePlaceholder') ?? 'Nombre completo'} />
                                <InputField icon={<FaIdCard />} name="document" value={form.document} onChange={handleChange} placeholder={t('register.documentPlaceholder') ?? 'Documento'} />

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

                                <InputField icon={<FaEnvelope />} name="email" type="email" value={form.email} onChange={handleChange} placeholder={t('register.emailPlaceholder') ?? 'Correo electrónico'} />
                                <InputField icon={<FaLock />} name="password" type="password" value={form.password} onChange={handleChange} placeholder={t('register.passwordPlaceholder') ?? 'Contraseña'} />
                                <InputField icon={<FaLock />} name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder={t('register.confirmPasswordPlaceholder') ?? 'Confirmar contraseña'} />

                                <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-3 rounded-full hover:bg-blue-700 transition font-semibold text-lg shadow-md">
                                    {loading ? (t('register.loading') ?? 'Registrando...') : (t('register.submitButton') ?? 'Registrarse')}
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
                        </>
                    ) : (
                        // --- Nuevo formulario de Verificación 2FA ---
                        <div className="flex flex-col items-center text-center w-full max-w-sm">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4">
                                {t('register.2faTitle') ?? 'Activar Verificación de 2 Pasos'}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                                {t('register.2faInstructions') ?? 'Escanea este código QR con tu aplicación de autenticación (ej. Google Authenticator) y luego ingresa el código de 6 dígitos.'}
                            </p>
                            {qrCodeDataUrl && (
                                <div className="mb-6 border-4 border-gray-200 dark:border-gray-700 rounded-lg p-2">
                                    {/* Data URL -> usar <img> es la opción práctica */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={qrCodeDataUrl} alt="QR Code" width={200} height={200} className="mx-auto" />
                                </div>
                            )}
                            <form onSubmit={handleVerify2FA} className="w-full space-y-5">
                                <InputField icon={<FaLock />} name="twoFactorCode" value={twoFactorCode} onChange={handle2FACodeChange} placeholder={t('register.2faCodePlaceholder') ?? 'Código de 6 dígitos'} type="text" />
                                <button disabled={loading} type="submit" className="w-full bg-green-600 text-white py-3 rounded-full hover:bg-green-700 transition font-semibold text-lg shadow-md">
                                    {loading ? (t('register.loading') ?? 'Verificando...') : (t('register.verifyButton') ?? 'Verificar y Activar')}
                                </button>
                            </form>
                        </div>
                    )}
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
            <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-transparent outline-none text-gray-800 dark:text-white" required />
        </div>
    );
}
