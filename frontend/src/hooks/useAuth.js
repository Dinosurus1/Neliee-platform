// src/hooks/useAuth.js
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { login as loginService, getMe, logoutUser } from "../api/authService";

/**
 * Mensajes de error amigables.
 * No exponemos mensajes internos del backend (queries SQL, nombres de tablas, etc.)
 */
function resolveErrorMessage(err) {
  const status = err.response?.status;
  const detail = err.response?.data?.detail;

  if (status === 401) return "Correo o contraseña incorrectos.";
  if (status === 403) return "Tu cuenta no tiene acceso. Contacta a la administración.";
  if (status === 422) return "Verifica que los datos ingresados sean correctos.";
  if (status === 429) return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
  if (status >= 500)  return "Error del servidor. Intenta más tarde.";

  // Solo mostrar el detail del backend si es un string corto y no parece interno
  if (typeof detail === "string" && detail.length < 120 && !detail.match(/SELECT|INSERT|Table|column/i)) {
    return detail;
  }

  return "Error al iniciar sesión. Intenta de nuevo.";
}

export function useAuth() {
  const { login, user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  /**
   * Maneja el flujo completo de login:
   * 1. Obtiene el access token (y el backend setea la httpOnly cookie)
   * 2. Guarda el access token en memoria para que axiosClient lo use
   * 3. Llama a /auth/me para obtener los datos reales del usuario
   * 4. Retorna el rol como fuente de verdad para la redirección
   */
  async function handleLogin(email, password) {
    setIsLoading(true);
    setError(null);
    try {
      const tokenData = await loginService(email, password);

      // Guardamos el access token via la acción del store (no setState directo)
      useAuthStore.getState().setAccessToken(tokenData.access_token);

      // getMe() es la fuente de verdad: rol, nombre, permisos, etc.
      const userData = await getMe();

      login(tokenData.access_token, userData);

      // Retornamos el rol de getMe(), no el del login response
      return userData.role;
    } catch (err) {
      setError(resolveErrorMessage(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Logout completo: invalida el token en el backend y limpia el estado local.
   * Preferir este sobre llamar a logout() del store directamente.
   */
  async function handleLogout() {
    await logoutUser();
  }

  return {
    handleLogin,
    handleLogout,
    user,
    isAuthenticated,
    isLoading,
    error,
  };
}