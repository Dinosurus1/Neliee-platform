// src/pages/employee/DashboardPage.jsx
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { getMyEnrollments } from "../../api/courseService";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";

export default function DashboardPage() {
  const { data: enrollments, isLoading, error } = useApi(getMyEnrollments);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-400">Error al cargar tus capacitaciones: {error}</p>
      </div>
    );
  }

  const total = enrollments?.length ?? 0;
  const completed = enrollments?.filter((e) => e.completed).length ?? 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-2xl font-bold text-gray-100">
            Mis Capacitaciones
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {completed} de {total} completadas
          </p>

          {/* Barra de progreso */}
          {total > 0 && (
            <div className="mt-4 h-1.5 w-full max-w-xs rounded-full bg-gray-800">
              <div
                className="h-1.5 rounded-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Grid de cursos */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        {!enrollments?.length ? (
          <div className="card flex flex-col items-center py-16 text-center">
            <span className="text-4xl">🎓</span>
            <p className="mt-4 font-display text-lg font-semibold text-gray-300">
              Sin capacitaciones asignadas
            </p>
            <p className="mt-2 text-sm text-gray-600">
              La administración te asignará cursos próximamente.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => (
              <CourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CourseCard({ enrollment }) {
  const { course, completed } = enrollment;

  return (
    <Link
      to={`/dashboard/curso/${enrollment.id}`}
      className="card group flex flex-col gap-3 transition-all duration-200
                 hover:border-cyan-500/50 hover:shadow-neon-sm"
    >
      {/* Miniatura / ícono */}
      <div className="flex h-32 items-center justify-center rounded-lg
                      bg-[var(--color-bg-secondary)] section-dots">
        <span className="text-4xl">🎬</span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-gray-100
                       group-hover:text-cyan-300 transition-colors line-clamp-2">
          {course.title}
        </h3>
        <Badge variant={completed ? "green" : "gray"}>
          {completed ? "✓ Listo" : "Pendiente"}
        </Badge>
      </div>

      {course.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>
      )}

      <span className="mt-auto text-xs font-medium text-cyan-400 group-hover:underline">
        Ver capacitación →
      </span>
    </Link>
  );
}