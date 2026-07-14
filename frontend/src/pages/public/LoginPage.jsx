// src/pages/public/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MESSAGE =
  "Demasiados intentos fallidos. Contacta a la administración para recuperar el acceso.";

export default function LoginPage() {
  const { handleLogin, handleVerify2FA, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]         = useState({ email: "", password: "" });
  const [attempts, setAttempts] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);

  // ── Paso 2FA (solo aparece si el dispositivo no era reconocido) ─────────
  const [pendingToken, setPendingToken] = useState(null);
  const [twoFAMessage, setTwoFAMessage] = useState("");
  const [code, setCode] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function redirectByRole(role) {
    if (role === "admin") {
      navigate("/admin", { replace: true });
    } else if (role === "employee") {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (lockedOut) return;

    const result = await handleLogin(form.email, form.password);

    if (!result) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) setLockedOut(true);
      return;
    }

    if (result.requires2FA) {
      setPendingToken(result.pendingToken);
      setTwoFAMessage(result.message);
      return;
    }

    redirectByRole(result.role);
  }

  async function handleVerifySubmit(e) {
    e.preventDefault();
    const result = await handleVerify2FA(pendingToken, code);
    if (!result) return; // el error ya se muestra vía `error` del hook
    redirectByRole(result.role);
  }

  function handleBackToLogin() {
    setPendingToken(null);
    setCode("");
    setTwoFAMessage("");
  }

  const displayError = lockedOut ? LOCKOUT_MESSAGE : error;
  const isVerifyingDevice = !!pendingToken;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-page)] px-4">

      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-1/2 opacity-30"
        style={{ background: "radial-gradient(ellipse 60% 70% at 0% 50%, var(--gold), transparent)" }}
      />
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, var(--sage), transparent)" }}
      />

      <div className="relative z-10 w-full max-w-md animate-fade-up">

        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <p className="font-display text-4xl font-bold text-[var(--brown-dark)]">Neliee</p>
            <p className="font-accent text-base italic text-[var(--bronze)]">cosmetics</p>
          </Link>
        </div>

        <div className="card shadow-warm-lg border-[var(--border-strong)]">

          {!isVerifyingDevice ? (
            <>
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-[var(--brown-dark)]">
                  Bienvenida de vuelta
                </h1>
                <p className="mt-1 font-body text-sm text-[var(--brown-mid)]">
                  Acceso exclusivo para el equipo Neliee
                </p>
              </div>

              <div className="divider-gold mb-6" />

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
                  disabled={lockedOut}
                />
                <Input
                  label="Contraseña"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  disabled={lockedOut}
                />

                {displayError && (
                  <div
                    className="rounded-xl border px-4 py-3"
                    style={{ background: "rgba(126,71,49,0.08)", borderColor: "rgba(126,71,49,0.25)" }}
                  >
                    <p className="font-body text-sm text-[var(--terracota)]">⚠ {displayError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={lockedOut}
                  className="mt-2 w-full justify-center"
                >
                  Ingresar
                </Button>
              </form>

              <p className="mt-6 text-center font-body text-xs text-[var(--brown-mid)]">
                ¿Problemas para acceder?{" "}
                <span className="font-medium text-[var(--terracota)]">
                  Contacta a la administración
                </span>
              </p>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-[var(--brown-dark)]">
                  Verifica tu identidad
                </h1>
                <p className="mt-1 font-body text-sm text-[var(--brown-mid)]">
                  {twoFAMessage || "Enviamos un código de 6 dígitos a tu correo."}
                </p>
              </div>

              <div className="divider-gold mb-6" />

              <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4">
                <Input
                  label="Código de verificación"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  name="code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                  className="text-center tracking-[0.5em] text-lg"
                />

                {error && (
                  <div
                    className="rounded-xl border px-4 py-3"
                    style={{ background: "rgba(126,71,49,0.08)", borderColor: "rgba(126,71,49,0.25)" }}
                  >
                    <p className="font-body text-sm text-[var(--terracota)]">⚠ {error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={code.length !== 6}
                  className="mt-2 w-full justify-center"
                >
                  Verificar
                </Button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="font-body text-xs text-[var(--brown-mid)] hover:text-[var(--terracota)] transition-colors text-center"
                >
                  ← Volver al inicio de sesión
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="font-body text-sm text-[var(--brown-mid)] hover:text-[var(--terracota)] transition-colors"
          >
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}