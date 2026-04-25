// src/pages/admin/ManageCourses.jsx
import { useState } from "react";
import { useApi } from "../../hooks/useApi";
import { getAllCourses, createCourse, updateCourse, deleteCourse } from "../../api/courseService";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

const emptyForm = { title: "", description: "", gdrive_video_id: "", order: 0, is_published: false };

export default function ManageCourses() {
  const { data: courses, isLoading, refetch } = useApi(getAllCourses);

  const [modal, setModal] = useState({ open: false, mode: "create", course: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setModal({ open: true, mode: "create", course: null });
  }

  function openEdit(course) {
    setForm({
      title: course.title,
      description: course.description ?? "",
      gdrive_video_id: course.gdrive_video_id,
      order: course.order,
      is_published: course.is_published,
    });
    setFormError(null);
    setModal({ open: true, mode: "edit", course });
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
      const payload = { ...form, order: Number(form.order) };
      if (modal.mode === "create") {
        await createCourse(payload);
      } else {
        await updateCourse(modal.course.id, payload);
      }
      setModal({ open: false });
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.detail ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(courseId) {
    if (!confirm("¿Eliminar esta capacitación?")) return;
    await deleteCourse(courseId);
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
            <h1 className="font-display text-2xl font-bold text-gray-100">Capacitaciones</h1>
            <p className="mt-1 text-sm text-gray-500">{courses?.length ?? 0} registradas</p>
          </div>
          <Button onClick={openCreate}>+ Nueva capacitación</Button>
        </div>
      </header>

      <main className="px-8 py-8">
        {!courses?.length ? (
          <div className="card flex flex-col items-center py-16 text-center">
            <span className="text-4xl">🎬</span>
            <p className="mt-4 text-gray-400">Aún no hay capacitaciones creadas.</p>
            <Button onClick={openCreate} className="mt-4">Crear primera capacitación</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((c) => (
                <div
                  key={c.id}
                  className="card flex flex-col gap-3 hover:border-cyan-500/40 transition-all"
                >
                  {/* Miniatura */}
                  <div className="flex h-24 items-center justify-center rounded-lg
                                  bg-[var(--color-bg-secondary)] section-dots">
                    <span className="text-3xl">🎬</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-gray-100 line-clamp-2 flex-1">
                      {c.title}
                    </h3>
                    <Badge variant={c.is_published ? "green" : "gray"}>
                      {c.is_published ? "Publicado" : "Borrador"}
                    </Badge>
                  </div>

                  {c.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{c.description}</p>
                  )}

                  <p className="font-mono text-xs text-gray-600 truncate">
                    ID: {c.gdrive_video_id}
                  </p>

                  <div className="mt-auto flex gap-2 pt-2 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => openEdit(c)}
                      className="flex-1 btn-outline py-1.5 text-xs justify-center"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5
                                 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.mode === "create" ? "Nueva capacitación" : "Editar capacitación"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Título"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Inducción corporativa"
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Descripción</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Descripción breve del contenido..."
              rows={3}
              className="input resize-none"
            />
          </div>
          <Input
            label="ID del video en Google Drive"
            name="gdrive_video_id"
            value={form.gdrive_video_id}
            onChange={handleChange}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
            required
          />
          <p className="text-xs text-gray-600 -mt-2">
            Solo el ID (la parte larga de la URL de Drive).
          </p>
          <Input
            label="Orden de aparición"
            type="number"
            name="order"
            value={form.order}
            onChange={handleChange}
            min={0}
          />
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              name="is_published"
              checked={form.is_published}
              onChange={handleChange}
              className="rounded"
            />
            Publicar (visible para empleadas)
          </label>

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