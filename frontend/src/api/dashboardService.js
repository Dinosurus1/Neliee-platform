import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { coordinatedRefresh, PUBLIC_PATHS } from "./authService";
/**
 * Cliente Axios para el backend del dashboard ERP (puerto 8001).
 *
 * Los 2 backends siguen siendo independientes. La diferencia es cómo
 * el frontend los alcanza:
 *
 *  LOCAL:      /api-dashboard  →  proxy Vite  →  http://localhost:8001
 *  CLOUDFLARE: VITE_DASHBOARD_API_URL = https://tu-tunel-8001.trycloudflare.com
 *
 * Así el frontend funciona igual en local y con túnel compartido.
 */




const api = axios.create({
  baseURL: import.meta.env.VITE_DASHBOARD_API_URL ?? "/api-dashboard",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      const newToken = await coordinatedRefresh();
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      if (!PUBLIC_PATHS.includes(window.location.pathname)) {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    }
  }
);

export const buildDownloadUrl = (endpoint) => {
  const base = api.defaults.baseURL ?? "";
  return base.startsWith("http")
    ? `${base}${endpoint}`
    : `${window.location.origin}${base}${endpoint}`;
};






export async function descargarConAuth(endpoint, nombreSugerido) {
  try {
    const response = await api.get(endpoint, { responseType: "blob" });
    const disposition = response.headers["content-disposition"];
    const match = disposition && disposition.match(/filename="?([^"]+)"?/);
    const nombre = match?.[1] || nombreSugerido || "descarga";
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // Con responseType: "blob", el cuerpo del error también llega como Blob
    // en err.response.data (no como JSON ya parseado) — hay que leerlo a mano.
    if (err.response?.data instanceof Blob) {
      try {
        const texto = await err.response.data.text();
        err.detail = JSON.parse(texto).detail;
      } catch {
        // el cuerpo del error no era JSON (ej. un 502 de un proxy intermedio)
      }
    }
    throw err;
  }
}

export default api;