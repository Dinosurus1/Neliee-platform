// src/store/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null, // Access token (solo en memoria)
      refreshToken: null, // Sí se persiste
      isAuthenticated: false,
      login: (tokenData, userData) =>
        set({
          token: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          user: userData,
          isAuthenticated: true,
        }),
      setAccessToken: (accessToken) => 
        set({ token: accessToken }),
      setRefreshToken: (refreshToken) => 
        set({ refreshToken }),
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
      updateUser: (partial) =>
        set((state) => ({
          user: { ...state.user, ...partial },
        })),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);