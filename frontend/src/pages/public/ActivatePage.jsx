// src/pages/public/ActivatePage.jsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { activateAccount } from "../../api/invitationService";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

// ─── Helper ───────────────────────────────────────────────────────────────────

function parseApiError(err, fallback = "Error inesperado.") {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg).join(" • ");
  if (typeof detail === "string") return detail;
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ full_name: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await activateAccount({ token, ...form });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(parseApiError(err, "No se pudo activar la cuenta."));
    } finally {
      setSaving(false);
    }
  }

  // ── Token ausente ─────────────────────────────────────────────────────────

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4">
        <div className="w-full max-w-md text-center">
          <span className="text-5xl">⚠️</span>
          <h1 className="mt-4 text-xl font-bold text-gray-100">Enlace inválido</h1>
          <p className="mt-2 text-sm text-gray-400">
            Este enlace no es válido. Solicita una nueva invitación al administrador.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm text-[#1D9E75] hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  // ── Activación exitosa ────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4">
        <div className="w-full max-w-md text-center">
          <span className="text-5xl">✅</span>
          <h1 className="mt-4 text-xl font-bold text-gray-100">¡Cuenta activada!</h1>
          <p className="mt-2 text-sm text-gray-400">
            Tu cuenta está lista. Serás redirigida al inicio de sesión en unos segundos…
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario de activación ──────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-gray-100">
            <span className="text-[#1D9E75]">Nel</span>iee
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Crea tu acceso a la plataforma
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8">
          <h2 className="mb-1 text-lg font-semibold text-gray-100">Activa tu cuenta</h2>
          <p className="mb-6 text-xs text-gray-500">
            Elige tu nombre y contraseña para completar el registro.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nombre completo"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Ana García"
              required
            />

            <div>
              <Input
                label="Contraseña"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mín. 8 caracteres"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Mínimo 8 caracteres · una mayúscula · una minúscula · un número
              </p>
            </div>

            {error && (
              <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" isLoading={saving} className="mt-2 w-full">
              Activar cuenta
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-[#1D9E75] hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}