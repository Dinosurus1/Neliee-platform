// src/components/layout/AdminLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
 
const navItems = [
  { to: "/admin",           label: "Dashboard",      icon: "⊞" },
  { to: "/admin/usuarios",  label: "Empleadas",      icon: "👥" },
  { to: "/admin/cursos",    label: "Capacitaciones", icon: "🎓" },
];
 
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
 
  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }
 
  return (
    <div className="flex min-h-screen bg-[var(--color-bg-primary)]">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-56 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {/* Logo */}
        <div className="border-b border-[var(--color-border)] px-6 py-5">
          <span className="font-display text-lg font-bold text-gradient">Neliee Admin</span>
        </div>
 
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/admin"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                     ${isActive
                       ? "bg-cyan-500/10 text-cyan-400 shadow-neon-sm"
                       : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                     }`
                  }
                >
                  <span>{icon}</span>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
 
        {/* User info + logout */}
        <div className="border-t border-[var(--color-border)] p-4">
          <p className="truncate text-xs text-gray-500">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full btn-outline py-1.5 text-xs justify-center"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
 
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
