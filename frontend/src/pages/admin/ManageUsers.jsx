// src/pages/admin/ManageUsers.jsx

import { useState } from "react";
import { useApi } from "../../hooks/useApi";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  enrollUser,
  removeEnrollment
} from "../../api/userService";

import { getAllCourses } from "../../api/courseService";

import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  is_active: true,
};

export default function ManageUsers() {
  const {
    data: users,
    isLoading,
    refetch,
  } = useApi(getUsers);

  // Cursos disponibles
  const { data: courses } = useApi(getAllCourses);

  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    user: null,
  });

  // Modal de inscripción
  const [enrollModal, setEnrollModal] = useState({
    open: false,
    user: null,
  });

  const [selectedCourses, setSelectedCourses] = useState([]);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState(null);

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);

    setModal({
      open: true,
      mode: "create",
      user: null,
    });
  }

  function openEdit(user) {
    setForm({
      full_name: user.full_name,
      email: user.email,
      password: "",
      is_active: user.is_active,
    });

    setFormError(null);

    setModal({
      open: true,
      mode: "edit",
      user,
    });
  }

  // Abrir modal de inscripción
  function openEnroll(user) {
  setFormError(null);

  // Cursos ya asignados
  const currentCourses =
    user.enrollments?.map(
      (enrollment) =>
        enrollment.course_id
    ) || [];

  setSelectedCourses(currentCourses);

  setEnrollModal({
    open: true,
    user,
  });
}

  function handleChange(e) {
    const { name, value, type, checked } =
      e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  // Seleccionar múltiples cursos
  function handleCourseToggle(courseId) {
    setSelectedCourses((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter(
          (id) => id !== courseId
        );
      }

      return [...prev, courseId];
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setSaving(true);
    setFormError(null);

    try {
      if (modal.mode === "create") {
        await createUser({
          ...form,
          role: "employee",
        });
      } else {
        const payload = {
          full_name: form.full_name,
          email: form.email,
          is_active: form.is_active,
        };

        if (form.password) {
          payload.password =
            form.password;
        }

        await updateUser(
          modal.user.id,
          payload
        );
      }

      setModal({
        open: false,
      });

      refetch();
    } catch (err) {
      setFormError(
        err.response?.data?.detail ??
          "Error al guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  // Inscribir en múltiples cursos
  async function handleEnrollSubmit(e) {
  e.preventDefault();

  setSaving(true);
  setFormError(null);

  try {
    // Cursos actuales
    const currentEnrollments =
      enrollModal.user?.enrollments || [];

    const currentCourseIds =
      currentEnrollments.map(
        (e) => e.course_id
      );

    // Nuevos cursos para agregar
    const coursesToAdd =
      selectedCourses.filter(
        (courseId) =>
          !currentCourseIds.includes(
            courseId
          )
      );

    // Cursos desmarcados para eliminar
    const enrollmentsToRemove =
      currentEnrollments.filter(
        (enrollment) =>
          !selectedCourses.includes(
            enrollment.course_id
          )
      );

    // Agregar nuevos
    for (const courseId of coursesToAdd) {
      await enrollUser(
        enrollModal.user.id,
        courseId
      );
    }

    // Eliminar removidos
    for (const enrollment of enrollmentsToRemove) {
      await removeEnrollment(
        enrollment.id
      );
    }

    alert(
      "Capacitaciones actualizadas correctamente."
    );

    setEnrollModal({
      open: false,
      user: null,
    });

    setSelectedCourses([]);

    refetch();
  } catch (err) {
    setFormError(
      err.response?.data?.detail ??
        "Error actualizando capacitaciones."
    );
  } finally {
    setSaving(false);
  }
}

  async function handleDelete(userId) {
    if (
      !confirm(
        "¿Eliminar esta empleada? Esta acción no se puede deshacer."
      )
    )
      return;

    await deleteUser(userId);

    refetch();
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-100">
              Empleadas
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {users?.length ?? 0} registradas
            </p>
          </div>

          <Button onClick={openCreate}>
            + Nueva empleada
          </Button>
        </div>
      </header>

      <main className="px-8 py-8">
        {!users?.length ? (
          <div className="card flex flex-col items-center py-16 text-center">
            <span className="text-4xl">
              👥
            </span>

            <p className="mt-4 text-gray-400">
              Aún no hay empleadas
              registradas.
            </p>

            <Button
              onClick={openCreate}
              className="mt-4"
            >
              Crear primera empleada
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-secondary)] text-left text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    Nombre
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Email
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Estado
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Registrada
                  </th>

                  <th className="px-4 py-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--color-border)]">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="bg-[var(--color-bg-card)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    <td className="px-4 py-3 font-medium text-gray-200">
                      {u.full_name}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {u.email}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          u.is_active
                            ? "green"
                            : "gray"
                        }
                      >
                        {u.is_active
                          ? "Activa"
                          : "Inactiva"}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(
                        u.created_at
                      ).toLocaleDateString(
                        "es-CO"
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end">
                        {/* NUEVO BOTÓN */}
                        <button
                          onClick={() =>
                            openEnroll(u)
                          }
                          className="text-xs text-green-400 hover:underline"
                        >
                          Inscribir
                        </button>

                        <button
                          onClick={() =>
                            openEdit(u)
                          }
                          className="text-xs text-cyan-400 hover:underline"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(u.id)
                          }
                          className="text-xs text-red-400 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal crear / editar */}
      <Modal
        isOpen={modal.open}
        onClose={() =>
          setModal({ open: false })
        }
        title={
          modal.mode === "create"
            ? "Nueva empleada"
            : "Editar empleada"
        }
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <Input
            label="Nombre completo"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Ana García"
            required
          />

          <Input
            label="Correo electrónico"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="ana@empresa.com"
            required
          />

          <Input
            label={
              modal.mode === "edit"
                ? "Nueva contraseña (dejar vacío para no cambiar)"
                : "Contraseña"
            }
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 8 caracteres"
            required={
              modal.mode === "create"
            }
          />

          {modal.mode === "edit" && (
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="rounded"
              />

              Cuenta activa
            </label>
          )}

          {formError && (
            <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {formError}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() =>
                setModal({
                  open: false,
                })
              }
              className="btn-outline py-2 px-4 text-xs"
            >
              Cancelar
            </button>

            <Button
              type="submit"
              isLoading={saving}
            >
              {modal.mode === "create"
                ? "Crear"
                : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL INSCRIPCIONES */}
      <Modal
        isOpen={enrollModal.open}
        onClose={() =>
          setEnrollModal({
            open: false,
            user: null,
          })
        }
        title={`Asignar capacitaciones a ${
          enrollModal.user?.full_name ||
          ""
        }`}
      >
        <form
          onSubmit={
            handleEnrollSubmit
          }
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3">
            <label className="text-sm text-gray-300">
              Selecciona una o más
              capacitaciones
            </label>

            {courses
              ?.filter(
                (course) =>
                  course.is_published
              )
              .map((course) => (
                <label
                  key={course.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 cursor-pointer hover:bg-[var(--color-bg-secondary)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(
                      course.id
                    )}
                    onChange={() =>
                      handleCourseToggle(
                        course.id
                      )
                    }
                  />

                  <span className="text-sm text-gray-200">
                    {course.title}
                  </span>
                </label>
              ))}
          </div>

          {formError && (
            <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                setEnrollModal({
                  open: false,
                  user: null,
                })
              }
              className="btn-outline py-2 px-4 text-xs"
            >
              Cancelar
            </button>

            <Button
              type="submit"
              isLoading={saving}
            >
              Asignar capacitaciones
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}