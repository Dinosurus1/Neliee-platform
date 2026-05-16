import axios from "axios";

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

export default api;