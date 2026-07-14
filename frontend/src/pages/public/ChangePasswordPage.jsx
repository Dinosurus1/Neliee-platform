// src/pages/public/ChangePasswordPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../../api/authService";
import { useAuthStore } from "../../store/authStore";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

function parseApiError(err, fallback = "Error inesperado.") {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg).join(" • ");
  if (typeof detail === "string") return detail;
  return fallback;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [form, setForm]     = useState({ current_password: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.new_password !== form.confirm) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(form.current_password, form.new_password);
      // El backend ya no exige cambio — reflejarlo localmente para que
      // el guard de App.jsx deje de redirigir aquí.
      updateUser({ must_change_password: false });
      navigate(user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      setError(parseApiError(err, "No se pudo cambiar la contraseña."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl font-bold text-[var(--brown-dark)]">Neliee</p>
        </div>

        <div className="card shadow-warm-lg border-[var(--border-strong)]">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-[var(--brown-dark)]">
              Actualiza tu contraseña
            </h1>
            <p className="mt-1 font-body text-sm text-[var(--brown-mid)]">
              Por seguridad, debes definir una nueva contraseña antes de continuar.
            </p>
          </div>

          <div className="divider-gold mb-6" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Contraseña actual"
              type="password"
              name="current_password"
              value={form.current_password}
              onChange={handleChange}
              required
              autoFocus
            />
            <Input
              label="Nueva contraseña"
              type="password"
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              required
            />
            <p className="-mt-2 text-xs text-[var(--brown-mid)]">
              Mínimo 8 caracteres · una mayúscula · una minúscula · un número
            </p>
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              required
            />

            {error && (
              <div
                className="rounded-xl border px-4 py-3"
                style={{ background: "rgba(126,71,49,0.08)", borderColor: "rgba(126,71,49,0.25)" }}
              >
                <p className="font-body text-sm text-[var(--terracota)]">⚠ {error}</p>
              </div>
            )}

            <Button type="submit" isLoading={saving} className="mt-2 w-full justify-center">
              Guardar contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}