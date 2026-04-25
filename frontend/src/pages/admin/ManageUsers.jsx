// src/pages/admin/ManageUsers.jsx
import { useState } from "react";
import { useApi } from "../../hooks/useApi";
import { getUsers, createUser, updateUser, deleteUser } from "../../api/userService";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

const emptyForm = { full_name: "", email: "", password: "", is_active: true };

export default function ManageUsers() {
  const { data: users, isLoading, refetch } = useApi(getUsers);

  const [modal, setModal] = useState({ open: false, mode: "create", user: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setModal({ open: true, mode: "create", user: null });
  }

  function openEdit(user) {
    setForm({ full_name: user.full_name, email: user.email, password: "", is_active: user.is_active });
    setFormError(null);
    setModal({ open: true, mode: "edit", user });
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (modal.mode === "create") {
        await createUser({ ...form, role: "employee" });
      } else {
        const payload = { full_name: form.full_name, email: form.email, is_active: form.is_active };
        if (form.password) payload.password = form.password;
        await updateUser(modal.user.id, payload);
      }
      setModal({ open: false });
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.detail ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId) {
    if (!confirm("¿Eliminar esta empleada? Esta acción no se puede deshacer.")) return;
    await deleteUser(userId);
    refetch();
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-100">Empleadas</h1>
            <p className="mt-1 text-sm text-gray-500">{users?.length ?? 0} registradas</p>
          </div>
          <Button onClick={openCreate}>+ Nueva empleada</Button>
        </div>
      </header>

      <main className="px-8 py-8">
        {!users?.length ? (
          <div className="card flex flex-col items-center py-16 text-center">
            <span className="text-4xl">👥</span>
            <p className="mt-4 text-gray-400">Aún no hay empleadas registradas.</p>
            <Button onClick={openCreate} className="mt-4">Crear primera empleada</Button>
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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {users.map((u) => (
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
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs text-cyan-400 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
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
        onClose={() => setModal({ open: false })}
        title={modal.mode === "create" ? "Nueva empleada" : "Editar empleada"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            label={modal.mode === "edit" ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 8 caracteres"
            required={modal.mode === "create"}
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
            <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">{formError}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal({ open: false })} className="btn-outline py-2 px-4 text-xs">
              Cancelar
            </button>
            <Button type="submit" isLoading={saving}>
              {modal.mode === "create" ? "Crear" : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}