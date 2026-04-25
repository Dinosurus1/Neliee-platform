// src/components/layout/DashboardLayout.jsx
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-primary)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/dashboard" className="font-display text-lg font-bold text-gradient">
            Neliee
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-400 sm:block">
              Hola,{" "}
              <span className="font-medium text-gray-200">
                {user?.full_name?.split(" ")[0]}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="btn-outline py-1.5 px-3 text-xs"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido de la página */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}