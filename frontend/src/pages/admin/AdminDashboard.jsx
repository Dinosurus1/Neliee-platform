// src/pages/admin/AdminDashboard.jsx
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { getUsers } from "../../api/userService";
import { getAllCourses } from "../../api/courseService";

export default function AdminDashboard() {
  const { data: users }   = useApi(getUsers);
  const { data: courses } = useApi(getAllCourses);

  const stats = [
    { label: "Empleadas",      value: users?.length ?? "—",                              icon: "👥", to: "/admin/usuarios", color: "var(--terracota)" },
    { label: "Capacitaciones", value: courses?.length ?? "—",                            icon: "🎓", to: "/admin/cursos",   color: "var(--bronze)" },
    { label: "Publicadas",     value: courses?.filter((c) => c.is_published).length ?? "—", icon: "✅", to: "/admin/cursos",   color: "var(--olive)" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <div className="border-b bg-[#5c4033] px-8 py-8" style={{ borderColor: "var(--border-warm)" }}>
        <h1 className="font-display text-2xl font-bold text-[var(--brown-dark)]">Panel de administración</h1>
        <p className="mt-1 font-body text-sm text-[var(--brown-mid)]">Resumen general de la plataforma Neliee</p>
      </div>

      <main className="px-8 py-10">
        {/* Stats */}
        <div className="grid gap-5 sm:grid-cols-3 mb-12">
          {stats.map((s) => (
            <Link key={s.label} to={s.to}
              className="card flex items-center gap-5 transition-all hover:-translate-y-1 hover:shadow-warm-md">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                style={{ background: `${s.color}18` }}>
                {s.icon}
              </div>
              <div>
                <p className="font-display text-3xl font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="font-body text-xs text-[var(--brown-mid)]">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Acciones rápidas */}
        <h2 className="mb-4 font-display text-lg font-semibold text-[var(--brown-dark)]">
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