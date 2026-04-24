// src/store/authStore.js
/**
 * Estado global de autenticación con Zustand.
 * Persiste el token en localStorage para mantener la sesión
 * al recargar la página.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,           // { id, full_name, email, role }
      token: null,
      isAuthenticated: false,

      /**
       * Llamado tras login exitoso con la respuesta del backend.
       * @param {{ access_token: string, role: string }} tokenData
       * @param {{ id, full_name, email, role }} userData
       */
      login: (tokenData, userData) =>
        set({
          token: tokenData.access_token,
          user: userData,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),

      /** Actualiza datos del perfil sin cerrar sesión */
      updateUser: (partial) =>
        set((state) => ({ user: { ...state.user, ...partial } })),
    }),
    {
      name: "auth-storage",         // Clave en localStorage
      partialize: (state) => ({     // Solo persiste token y user (no funciones)
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);