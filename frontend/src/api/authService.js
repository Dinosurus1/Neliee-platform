// src/api/authService.js
import axiosClient from "./axiosClient";
import { useAuthStore } from "../store/authStore";

/**
 * Login: envía credenciales como form-data (OAuth2 password flow).
 * El backend devuelve { access_token, token_type, role } en el body
 * y setea el refresh_token como httpOnly cookie con Set-Cookie.
 * El frontend nunca ve ni toca el refresh token.
 */
export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const { data } = await axiosClient.post("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data; // { access_token, token_type, role }
}

/**
 * Obtiene el perfil del usuario autenticado.
 * Es la fuente de verdad para el rol y datos del usuario.
 */
export async function getMe() {
  const { data } = await axiosClient.get("/auth/me");
  return data;
}

/**
 * Refresca el access token.
 * El refresh token viaja automáticamente en la httpOnly cookie
 * gracias a withCredentials: true en axiosClient.
 * NO se envía nada en el body — el backend lo lee de la cookie.
 *
 * El backend también debe rotar la httpOnly cookie en cada refresh
 * (emitir una nueva cookie con nuevo refresh token).
 */
export async function tryRefreshToken() {
  try {
    const { data } = await axiosClient.post("/auth/refresh");
    // Solo actualizamos el access token en memoria
    useAuthStore.getState().setAccessToken(data.access_token);
    return data.access_token;
  } catch {
    // Si el refresh falla, limpiamos el estado local.
    // La cookie ya expiró o fue invalidada por el backend.
    useAuthStore.getState().logout();
    return null;
  }
}

/**
 * Logout completo:
 * 1. Llama al backend para invalidar el refresh token en BD
 *    y limpiar la httpOnly cookie con Set-Cookie: refresh_token=; Max-Age=0
 * 2. Limpia el estado local (siempre, aunque el backend falle)
 */
export async function logoutUser() {
  try {
    await axiosClient.post("/auth/logout");
  } catch {
    // Si el backend no responde, igual limpiamos localmente.
    // El refresh token expirará solo en el backend.
  } finally {
    useAuthStore.getState().logout();
  }
}

export async function verifyTwoFactor(pendingToken, code) {
  const { data } = await axiosClient.post("/auth/verify-2fa", {
    pending_token: pendingToken,
    code,
  });
  return data; // { access_token, token_type, role }
}


export async function changePassword(currentPassword, newPassword) {
  const { data } = await axiosClient.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data; // { message: "Password changed successfully" }
}