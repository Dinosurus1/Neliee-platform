import axiosClient from "./axiosClient";
import { useAuthStore } from "../store/authStore";
/**
 * Login: recibe email y password, devuelve { access_token, role }
 * Usa URLSearchParams porque el backend espera form-data (OAuth2).
 */
export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const { data } = await axiosClient.post("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data; // { access_token, token_type, role }
}

export async function getMe() {
  const { data } = await axiosClient.get("/auth/me");
  return data;
}

export async function tryRefreshToken() {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const {data} = await axiosClient.post("/auth/refresh", { refresh_token: refreshToken }

  );

  useAuthStore.getState().setAccessToken(data.access_token);
  useAuthStore.getState().setRegfreshToken(data.refresh_token);
  return data.access_token;

}catch (error) {
  useAuthStore.getState().logout();
  return null;
}
}
export async function logoutUser() {
  useAuthStore.getState().logout();
}
