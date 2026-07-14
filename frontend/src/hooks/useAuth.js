// src/hooks/useAuth.js
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { login as loginService, verifyTwoFactor as verifyTwoFactorService, getMe, logoutUser } from "../api/authService";

/**
 * Mensajes de error amigables.
 * `context` distingue si el error viene del paso de credenciales o del
 * paso de verificación de código, porque un 401 significa cosas distintas.
 */
function resolveErrorMessage(err, context = "login") {
  const status = err.response?.status;
  const detail = err.response?.data?.detail;

  if (status === 401) {
    return context === "2fa" ? "Código incorrecto o expirado." : "Correo o contraseña incorrectos.";
  }
  if (status === 403) return "Tu cuenta no tiene acceso. Contacta a la administración.";
  if (status === 422) return "Verifica que los datos ingresados sean correctos.";
  if (status === 429) return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
  if (status >= 500)  return "Error del servidor. Intenta más tarde.";

  if (typeof detail === "string" && detail.length < 120 && !detail.match(/SELECT|INSERT|Table|column/i)) {
    return detail;
  }

  return context === "2fa"
    ? "Error al verificar el código. Intenta de nuevo."
    : "Error al iniciar sesión. Intenta de nuevo.";
}

export function useAuth() {
  const { login, user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  /** Pasos finales compartidos: guardar access token en memoria + traer /auth/me. */
  async function _completeLogin(tokenData) {
    useAuthStore.getState().setAccessToken(tokenData.access_token);
    const userData = await getMe();
    login(tokenData.access_token, userData);
    return userData.role;
  }

  /**
   * Paso 1: credenciales.
   * Retorna:
   *   null                                        → error (ver `error`)
   *   { requires2FA, pendingToken, message }       → dispositivo nuevo, falta código
   *   { role }                                     → sesión completa (dispositivo confiado)
   */
  async function handleLogin(email, password) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginService(email, password);

      if (result.requires_2fa) {
        return {
          requires2FA: true,
          pendingToken: result.pending_token,
          message: result.message,
        };
      }

      const role = await _completeLogin(result);
      return { role };
    } catch (err) {
      setError(resolveErrorMessage(err, "login"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Paso 2 (solo si handleLogin devolvió requires2FA): verificar el código.
   * Retorna null en error, { role } en éxito.
   */
  async function handleVerify2FA(pendingToken, code) {
    setIsLoading(true);
    setError(null);
    try {
      const tokenData = await verifyTwoFactorService(pendingToken, code);
      const role = await _completeLogin(tokenData);
      return { role };
    } catch (err) {
      setError(resolveErrorMessage(err, "2fa"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await logoutUser();
  }

  return {
    handleLogin,
    handleVerify2FA,
    handleLogout,
    user,
    isAuthenticated,
    isLoading,
    error,
  };
}