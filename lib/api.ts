// Define la base de la URL de tu API
// Utiliza process.env.NEXT_PUBLIC_API_URL para acceder a la variable
// de entorno en el frontend. No necesitas importar 'dotenv/config'.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://backend-x2ed.onrender.com/api";

// --- Tipos de datos ---
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  document?: string;
  role?: number;
}

// Interfaz para la respuesta de registro que puede incluir el código QR
export interface RegisterResponse {
  message: string;
  token?: string;
  user?: {
    nomUsuario: string;
    docUsuario: string;
    emaUsuario: string;
    rol: {
      nomRol: string;
    };
  };
  qrCodeDataUrl?: string; // Este campo es opcional y solo se devuelve con 2FA
}

export interface LoginData {
  email: string;
  password: string;
}

// Interfaz para la respuesta de login, ahora más flexible
export interface LoginResponse {
  message: string;
  token?: string;
  user?: {
    nomUsuario: string;
    docUsuario: string;
    emaUsuario: string;
    rol: {
      nomRol: string;
    };
  };
  requires2FA?: boolean; // Nuevo campo para indicar si el 2FA es requerido
  email?: string; // Nuevo campo para enviar el email de vuelta
}

// Nueva interfaz para la respuesta de la verificación del 2FA
export interface VerifyLogin2FAResponse {
  message: string;
  token: string;
  user: {
    nomUsuario: string;
    docUsuario: string;
    emaUsuario: string;
    photoUrl?: string;
    rol: {
      nomRol: string;
    };
    habilitado2FA: boolean;
  };
}

export interface ProfileResponse {
  message: string;
  user: {
    nomUsuario: string;
    docUsuario: string;
    emaUsuario: string;
    photoUrl?: string;
    rol: {
      nomRol: string;
    };
    habilitado2FA?: boolean;
  };
}

/**
 * Intenta parsear el body JSON de la respuesta; si no es JSON devuelve null.
 * Devuelve `unknown` (evitamos `any`).
 */
async function parseErrorBody(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// --- Registrar usuario ---
// Se actualizó el tipo de retorno para incluir la posibilidad de recibir un QR
export async function registerUser(data: FormData): Promise<RegisterResponse> {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      body: data,
    });

    if (!res.ok) {
      const errorBody = await parseErrorBody(res);
      const message =
        (errorBody &&
        typeof errorBody === "object" &&
        "message" in (errorBody as Record<string, unknown>)
          ? (errorBody as Record<string, unknown>).message
          : undefined) || `Error al registrar usuario (status ${res.status})`;
      throw new Error(String(message));
    }

    return (await res.json()) as RegisterResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg || "Error de red al registrar usuario");
  }
}

// --- Nueva función para verificar el 2FA ---
export async function verify2fa(
  email: string,
  twoFactorCode: string
): Promise<{ message: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/verify-2fa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, twoFactorCode }),
    });

    if (!res.ok) {
      const errorBody = await parseErrorBody(res);
      const message =
        (errorBody &&
        typeof errorBody === "object" &&
        "message" in (errorBody as Record<string, unknown>)
          ? (errorBody as Record<string, unknown>).message
          : undefined) ||
        `Error al verificar el código 2FA (status ${res.status})`;
      throw new Error(String(message));
    }

    return (await res.json()) as { message: string };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg || "Error de red al verificar el código 2FA");
  }
}

// --- INICIAR SESIÓN ---
// La respuesta de esta función ahora puede ser tanto un token como un flag de 2FA
export async function loginUser(data: LoginData): Promise<LoginResponse> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorBody = await parseErrorBody(res);
      const message =
        (errorBody &&
        typeof errorBody === "object" &&
        "message" in (errorBody as Record<string, unknown>)
          ? (errorBody as Record<string, unknown>).message
          : undefined) || `Error al iniciar sesión (status ${res.status})`;
      throw new Error(String(message));
    }

    return (await res.json()) as LoginResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg || "Error de red al iniciar sesión");
  }
}

// --- NUEVA función para verificar el código 2FA y completar el login ---
export async function verifyLogin2fa(
  email: string,
  twoFactorCode: string
): Promise<VerifyLogin2FAResponse> {
  try {
    const res = await fetch(`${API_URL}/auth/verify-login-2fa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, twoFactorCode }),
    });

    if (!res.ok) {
      const errorBody = await parseErrorBody(res);
      const message =
        (errorBody &&
        typeof errorBody === "object" &&
        "message" in (errorBody as Record<string, unknown>)
          ? (errorBody as Record<string, unknown>).message
          : undefined) ||
        `Error al verificar el código 2FA para iniciar sesión (status ${res.status})`;
      throw new Error(String(message));
    }

    return (await res.json()) as VerifyLogin2FAResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg || "Error de red al verificar el código 2FA");
  }
}

// --- Obtener perfil del usuario ---
// NOTA: usa localStorage (soporta solo ejecución en cliente)
export async function getUserProfile(): Promise<ProfileResponse> {
  if (typeof window === "undefined") {
    throw new Error(
      "getUserProfile must be called from the browser (client-side)"
    );
  }

  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No hay token de autenticación disponible");
  }

  const res = await fetch(`${API_URL}/auth/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorBody = await parseErrorBody(res);
    const message =
      (errorBody &&
      typeof errorBody === "object" &&
      "message" in (errorBody as Record<string, unknown>)
        ? (errorBody as Record<string, unknown>).message
        : undefined) || `Error al obtener el perfil (status ${res.status})`;
    throw new Error(String(message));
  }

  return (await res.json()) as ProfileResponse;
}

// --- Verificar si el backend responde ---
// Cambié el tipo de retorno para eliminar `any`
export async function pingBackend(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${API_URL}/ping`);
    if (!res.ok) {
      throw new Error("El backend no responde");
    }
    const json = await res.json();
    // Aseguramos que devolvemos un objeto genérico
    if (typeof json === "object" && json !== null) {
      return json as Record<string, unknown>;
    }
    return { result: json };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg || "Error de red");
  }
}
