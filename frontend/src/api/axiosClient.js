// src/api/axiosClient.js
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { tryRefreshToken } from "./authService";

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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

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

    // Guard 1: solo manejar 401
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Guard 2: no reintentar si ya se reintentó
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    /**
     * Guard 3: no intentar refresh sobre los endpoints de auth.
     * Previene loops infinitos si /auth/refresh o /auth/login devuelven 401.
     */
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login");
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Si ya hay un refresh en curso, encolar este request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newToken = await tryRefreshToken();
      if (!newToken) throw new Error("Refresh fallido");

      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().logout();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosClient;