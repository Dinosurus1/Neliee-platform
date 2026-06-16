import axiosClient from "./axiosClient";

export async function getUsers() {
  const { data } = await axiosClient.get("/admin/users");
  return data;
}

export async function createUser(payload) {
  const { data } = await axiosClient.post("/admin/users", payload);
  return data;
}

export async function updateUser(userId, payload) {
  const { data } = await axiosClient.patch(`/admin/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId) {
  await axiosClient.delete(`/admin/users/${userId}`);
}

// Inscripciones
export async function enrollUser(userId, courseId) {
  const { data } = await axiosClient.post("/enrollments/admin", { user_id: userId, course_id: courseId });
  return data;
}

export async function removeEnrollment(enrollmentId) {
  await axiosClient.delete(`/enrollments/admin/${enrollmentId}`);
}