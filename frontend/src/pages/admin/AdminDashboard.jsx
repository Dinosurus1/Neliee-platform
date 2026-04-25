// src/pages/admin/AdminDashboard.jsx
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { getUsers } from "../../api/userService";
import { getAllCourses } from "../../api/courseService";

export default function AdminDashboard() {
  const { data: users, isLoading: loadingUsers } = useApi(getUsers);
  const { data: courses, isLoading: loadingCourses } = useApi(getAllCourses);

  const stats = [
    { label: "Empleadas",         value: users?.length ?? "—",   icon: "👥", to: "/admin/usuarios" },
    { label: "Capacitaciones",    value: courses?.length ?? "—",  icon: "🎓", to: "/admin/cursos" },
    { label: "Publicadas",
      value: courses?.filter((c) => c.is_published).length ?? "—",
      icon: "✅", to: "/admin/cursos" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Resumen general de la plataforma</p>
      </div>

      <main className="px-8 py-10">
        {/* Stats */}
        <div className="grid gap-5 sm:grid-cols-3 mb-12">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="card group flex items-center gap-4 transition-all
                         hover:border-cyan-500/50 hover:shadow-neon-sm"
            >
              <span className="text-3xl">{s.icon}</span>
              <div>
                <p className="font-display text-3xl font-bold text-gradient">
                  {s.value}
                </p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Acciones rápidas */}
        <h2 className="mb-4 font-display text-lg font-semibold text-gray-300">
          Acciones rápidas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <Link to="/admin/usuarios" className="btn-outline justify-center py-3">
            👥 Gestionar Empleadas
          </Link>
          <Link to="/admin/cursos" className="btn-outline justify-center py-3">
            🎓 Gestionar Capacitaciones
          </Link>
        </div>
      </main>
    </div>
  );
}