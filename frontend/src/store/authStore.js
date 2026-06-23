// src/store/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Store de autenticación.
 *
 * Modelo de tokens:
 *  - Access token  → solo en memoria (esta store, sin persistir).
 *  - Refresh token → httpOnly cookie manejada por el backend.
 *                    El frontend NUNCA lo lee ni lo almacena.
 *
 * Solo se persiste en localStorage lo mínimo para evitar flash de UI:
 *  user e isAuthenticated.
 * isAuthenticated se valida contra el backend al iniciar la app (ver App.jsx).
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,           // Access token — solo en memoria, no persiste
      isAuthenticated: false,

      /**
       * Llamado tras login exitoso.
       * @param {string} accessToken
       * @param {object} userData — datos de /auth/me (fuente de verdad del rol)
       */
      login: (accessToken, userData) =>
        set({
          token: accessToken,
          user: userData,
          isAuthenticated: true,
        }),

      /** Actualiza el access token en memoria (tras refresh). */
      setAccessToken: (accessToken) =>
        set({ token: accessToken }),

      /** Limpia todo el estado local. El backend invalida la cookie. */
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),

      /** Merge parcial sobre user (útil si el backend actualiza el perfil). */
      updateUser: (partial) =>
        set((state) => ({
          user: { ...state.user, ...partial },
        })),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        // No persistimos token (access) — muere con la pestaña.
        // No persistimos el refresh token — vive en httpOnly cookie.
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);