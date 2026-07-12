// src/pages/admin/ManageUsers.jsx

import { useState } from "react";
import { useApi } from "../../hooks/useApi";

import {
  getUsers,
  updateUser,
  deleteUser,
  enrollUser,
  removeEnrollment,
} from "../../api/userService";

// ← createUser eliminado: el flujo ahora es siempre por invitación
import {
  sendInvitation,
  getPendingInvitations,
  cancelInvitation,
} from "../../api/invitationService";

import { getAllCourses } from "../../api/courseService";

import Modal   from "../../components/ui/Modal";
import Button  from "../../components/ui/Button";
import Input   from "../../components/ui/Input";
import Badge   from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

// ─── Helper: normaliza errores de FastAPI ──────────────────────────────────────

function parseApiError(err, fallback = "Error inesperado.") {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg).join(" • ");
  if (typeof detail === "string") return detail;
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ManageUsers() {
  // Carga usuarios activos/inactivos e invitaciones pendientes en paralelo
  const { data: users,              isLoading: loadingUsers,   refetch: refetchUsers   } = useApi(getUsers);
  const { data: pendingInvitations, isLoading: loadingPending, refetch: refetchPending } = useApi(getPendingInvitations);
  const { data: courses } = useApi(getAllCourses);

  // mode: "invite" | "edit" | "enroll" | null
  const [activeModal, setActiveModal] = useState({ mode: null, user: null });
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [form,      setForm]      = useState({ email: "", full_name: "", password: "", is_active: true });
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  // ── Abrir modales ───────────────────────────────────────────────────────────

  function openInvite() {
    setForm({ email: "" });
    setFormError(null);
    setActiveModal({ mode: "invite", user: null });
  }

  function openEdit(user) {
    setForm({ full_name: user.full_name, email: user.email, password: "", is_active: user.is_active });
    setFormError(null);
    setActiveModal({ mode: "edit", user });
  }

  function openEnroll(user) {
    setSelectedCourses(user.enrollments?.map((e) => e.course_id) ?? []);
    setFormError(null);
    setActiveModal({ mode: "enroll", user });
  }

  function closeModal() {
    setActiveModal({ mode: null, user: null });
    setFormError(null);
  }

  // ── Handlers de formulario ──────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleCourseToggle(courseId) {
    setSelectedCourses((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  }

  // ── Enviar invitación (reemplaza crear directamente) ────────────────────────

  async function handleInviteSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await sendInvitation(form.email);
      closeModal();
      refetchPending(); // la fila "Pendiente" aparece de inmediato en la tabla
    } catch (err) {
      setFormError(parseApiError(err, "Error al enviar la invitación."));
    } finally {
      setSaving(false);
    }
  }

  // ── Editar usuario existente ────────────────────────────────────────────────

  async function handleEditSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = { full_name: form.full_name, email: form.email, is_active: form.is_active };
      if (form.password) payload.password = form.password;
      await updateUser(activeModal.user.id, payload);
      closeModal();
      refetchUsers();
    } catch (err) {
      setFormError(parseApiError(err, "Error al guardar."));
    } finally {
      setSaving(false);
    }
  }

  // ── Inscripciones ───────────────────────────────────────────────────────────

  async function handleEnrollSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const currentEnrollments = activeModal.user?.enrollments ?? [];
      const currentCourseIds   = currentEnrollments.map((e) => e.course_id);
      const coursesToAdd        = selectedCourses.filter((id) => !currentCourseIds.includes(id));
      const enrollmentsToRemove = currentEnrollments.filter(
        (enrollment) => !selectedCourses.includes(enrollment.course_id)
      );
      await Promise.all([
        ...coursesToAdd.map((courseId) => enrollUser(activeModal.user.id, courseId)),
        ...enrollmentsToRemove.map((enrollment) => removeEnrollment(enrollment.id)),
      ]);
      closeModal();
      refetchUsers();
    } catch (err) {
      setFormError(parseApiError(err, "Error actualizando capacitaciones."));
    } finally {
      setSaving(false);
    }
  }

  // ── Eliminar usuario ────────────────────────────────────────────────────────

  async function handleDelete(userId) {
    if (!confirm("¿Eliminar esta empleada? Esta acción no se puede deshacer.")) return;
    try {
      await deleteUser(userId);
      refetchUsers();
    } catch (err) {
      alert(parseApiError(err, "Error al eliminar."));
    }
  }

  // ── Cancelar invitación pendiente ───────────────────────────────────────────

  async function handleCancelInvitation(invitationId) {
    if (!confirm("¿Cancelar esta invitación? El enlace del correo dejará de funcionar.")) return;
    try {
      await cancelInvitation(invitationId);
      refetchPending();
    } catch (err) {
      alert(parseApiError(err, "Error al cancelar la invitación."));
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingUsers || loadingPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalCount = (users?.length ?? 0) + (pendingInvitations?.length ?? 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">

      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-100">Empleadas</h1>
            <p className="mt-1 text-sm text-gray-500">{totalCount} registradas</p>
          </div>
          <Button onClick={openInvite}>+ Nueva empleada</Button>
        </div>
      </header>

      {/* Tabla */}
      <main className="px-8 py-8">
        {totalCount === 0 ? (
          <div className="card flex flex-col items-center py-16 text-center">
            <span className="text-4xl">👥</span>
            <p className="mt-4 text-gray-400">Aún no hay empleadas registradas.</p>
            <Button onClick={openInvite} className="mt-4">Invitar primera empleada</Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-secondary)] text-left text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Registrada</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">

                {/* ── Invitaciones pendientes (arriba) ── */}
                {(pendingInvitations ?? []).map((inv) => (
                  <tr
                    key={`inv-${inv.id}`}
                    className="bg-[var(--color-bg-card)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    <td className="px-4 py-3 italic text-gray-500">—</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{inv.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="amber">Pendiente</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(inv.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* ── Usuarios activos / inactivos ── */}
                {(users ?? []).map((u) => (
                  <tr
                    key={u.id}
                    className="bg-[var(--color-bg-card)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    <td className="px-4 py-3 font-medium text-gray-200">{u.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.is_active ? "green" : "gray"}>
                        {u.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEnroll(u)} className="text-xs text-green-400 hover:underline">
                          Inscribir
                        </button>
                        <button onClick={() => openEdit(u)} className="text-xs text-cyan-400 hover:underline">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="text-xs text-red-400 hover:underline">
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

      {/* ── Modal: invitar empleada ── */}
      <Modal isOpen={activeModal.mode === "invite"} onClose={closeModal} title="Invitar empleada">
        <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-400">
            Se enviará un correo con un enlace para que la empleada cree su contraseña y active su cuenta.
          </p>
          <Input
            label="Correo electrónico"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="ana@empresa.com"
            required
          />
          {formError && (
            <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">{formError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-outline px-4 py-2 text-xs">
              Cancelar
            </button>
            <Button type="submit" isLoading={saving}>Enviar invitación</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: editar empleada ── */}
      <Modal isOpen={activeModal.mode === "edit"} onClose={closeModal} title="Editar empleada">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
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
            label="Nueva contraseña (dejar vacío para no cambiar)"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Mín. 8 caracteres"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="rounded"
            />
            Cuenta activa
          </label>
          {formError && (
            <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">{formError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-outline px-4 py-2 text-xs">
              Cancelar
            </button>
            <Button type="submit" isLoading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: inscripciones ── */}
      <Modal
        isOpen={activeModal.mode === "enroll"}
        onClose={closeModal}
        title={`Asignar capacitaciones a ${activeModal.user?.full_name ?? ""}`}
      >
        <form onSubmit={handleEnrollSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <label className="text-sm text-gray-300">Selecciona una o más capacitaciones</label>
            {courses
              ?.filter((course) => course.is_published)
              .map((course) => (
                <label
                  key={course.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 hover:bg-[var(--color-bg-secondary)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(course.id)}
                    onChange={() => handleCourseToggle(course.id)}
                  />
                  <span className="text-sm text-gray-200">{course.title}</span>
                </label>
              ))}
          </div>
          {formError && (
            <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">{formError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-outline px-4 py-2 text-xs">
              Cancelar
            </button>
            <Button type="submit" isLoading={saving}>Asignar capacitaciones</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}