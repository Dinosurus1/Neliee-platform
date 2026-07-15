// src/api/axiosClient.js
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { coordinatedRefresh, PUBLIC_PATHS } from "./authService";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
  /**
   * REQUERIDO para httpOnly cookies.
   * Le dice al browser que incluya cookies en requests cross-origin
   * y que acepte las que el backend envíe con Set-Cookie.
   * El backend debe tener allow_credentials=True en CORS y NO usar allow_origins=["*"].
   */
  withCredentials: true,
});



// ── Interceptor de request: adjunta el access token a cada llamada ─────────
axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Interceptor de response: refresca el access token si expira ────────────
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Red de seguridad: si el backend exige cambio de contraseña, redirige ya.
    if (
      error.response?.status === 403 &&
      error.response?.data?.detail === "PASSWORD_CHANGE_REQUIRED" &&
      window.location.pathname !== "/cambiar-password"
    ) {
      window.location.href = "/cambiar-password";
      return Promise.reject(error);
    }

    // Guard 1: solo manejar 401
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // FIX: faltaba el || — antes /auth/verify-2fa nunca entraba aquí
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/verify-2fa");
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Si ya hay un refresh en curso, encolar este request
    originalRequest._retry = true;

    try {
      const newToken = await coordinatedRefresh();
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      if (!PUBLIC_PATHS.includes(window.location.pathname)) {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    }
  }
);

export default axiosClient;