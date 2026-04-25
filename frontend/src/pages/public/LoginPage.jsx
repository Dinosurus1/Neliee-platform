// src/pages/public/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function LoginPage() {
  const { handleLogin, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const role = await handleLogin(form.email, form.password);
    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "employee") navigate("/dashboard", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] section-dots px-4">
      {/* Glow de fondo */}
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient" />

      <div className="card relative w-full max-w-sm animate-slide-up shadow-neon-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-bold text-gradient">Neliee</span>
          <p className="mt-2 text-sm text-gray-500">Acceso para empleadas</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            type="email"
            name="email"
            placeholder="tu@correo.com"
            value={form.email}
            onChange={handleChange}
            required
            autoFocus
          />
          <Input
            label="Contraseña"
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" isLoading={isLoading} className="mt-2 w-full justify-center">
            Ingresar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-600">
          ¿Problemas para acceder? Contacta a la administración.
        </p>
      </div>
    </div>
  );
}