import axiosClient from "./axiosClient";

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