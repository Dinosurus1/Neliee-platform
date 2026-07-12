// src/api/invitationService.js
import axiosClient from "./axiosClient";

/** Admin: envía invitación a un email. */
export async function sendInvitation(email) {
  const { data } = await axiosClient.post("/invitations/send", { email });
  return data;
}

/** Admin: lista invitaciones vigentes sin usar. */
export async function getPendingInvitations() {
  const { data } = await axiosClient.get("/invitations/pending");
  return data;
}

/** Admin: cancela una invitación pendiente. */
export async function cancelInvitation(invitationId) {
  await axiosClient.delete(`/invitations/${invitationId}`);
}

/** Público: la empleada activa su cuenta con el token del correo. */
export async function activateAccount(payload) {
  // payload: { token, full_name, password }
  const { data } = await axiosClient.post("/invitations/activate", payload);
  return data;
}