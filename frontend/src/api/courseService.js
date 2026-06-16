import axiosClient from "./axiosClient";

// Empleada: cursos publicados asignados a ella
export async function getMyEnrollments() {
  const { data } = await axiosClient.get("/enrollments/me");
  return data; // [{ id, course: { id, title, ... }, completed }]
}

export async function markCourseComplete(enrollmentId) {
  const { data } = await axiosClient.patch(`/enrollments/me/${enrollmentId}/complete`);
  return data;
}

// Admin: todos los cursos
export async function getAllCourses() {
  const { data } = await axiosClient.get("/courses");
  return data;
}



export async function createCourse(payload) {
  const { data } = await axiosClient.post("/courses/admin", payload);
  return data;
}

export async function updateCourse(courseId, payload) {
  const { data } = await axiosClient.patch(`/courses/admin/${courseId}`, payload);
  return data;
}
export async function deleteCourse(courseId) {
  await axiosClient.delete(`/courses/admin/${courseId}`);
}