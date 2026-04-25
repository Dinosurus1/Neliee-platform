import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { login as loginService, getMe } from "../api/authService";

export function useAuth() {
  const { login, logout, user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin(email, password) {
    setIsLoading(true);
    setError(null);
    try {
      const tokenData = await loginService(email, password);
      // Guardamos el token primero para que axiosClient lo use en getMe()
      useAuthStore.setState({ token: tokenData.access_token });
      const userData = await getMe();
      login(tokenData, userData);
      return tokenData.role; // Retorna rol para redirigir desde LoginPage
    } catch (err) {
      setError(err.response?.data?.detail ?? "Error al iniciar sesión.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { handleLogin, logout, user, isAuthenticated, isLoading, error };
}