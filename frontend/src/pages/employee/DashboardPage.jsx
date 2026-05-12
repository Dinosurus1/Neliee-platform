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
        <p className="font-body text-sm text-[var(--terracota)]">Error al cargar tus capacitaciones: {error}</p>
      </div>
    );
  }

  const total     = enrollments?.length ?? 0;
  const completed = enrollments?.filter((e) => e.completed).length ?? 0;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      {/* Header */}
      <div className="border-b bg-black px-6 py-8" style={{ borderColor: "var(--border-warm)" }}>
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-2xl font-bold text-[var(--brown-dark)]">
            Mis Capacitaciones
          </h1>
          <p className="mt-1 font-body text-sm text-[var(--brown-mid)]">
            {completed} de {total} completadas — {pct}% de progreso
          </p>

          {total > 0 && (
            <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full" style={{ background: "var(--cream)" }}>
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--gold), var(--terracota))" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        {!enrollments?.length ? (
          <div className="card flex flex-col items-center py-16 text-center shadow-warm-md">
            <span className="text-5xl">🌿</span>
            <p className="mt-4 font-display text-lg font-semibold text-[var(--brown-dark)]">
              Sin capacitaciones asignadas
            </p>
            <p className="mt-2 font-body text-sm text-[var(--brown-mid)]">
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
      className="group card flex flex-col gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-warm-md"
    >
      <div
        className="flex h-32 items-center justify-center rounded-xl text-4xl"
        style={{ background: "linear-gradient(145deg, var(--cream) 0%, var(--bg-muted) 100%)" }}
      >
        🎬
      </div>

      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-[var(--brown-dark)] line-clamp-2
                       group-hover:text-[var(--terracota)] transition-colors">
          {course.title}
        </h3>
        <Badge variant={completed ? "green" : "gray"}>
          {completed ? "✓ Listo" : "Pendiente"}
        </Badge>
      </div>

      {course.description && (
        <p className="font-body text-xs text-[var(--brown-mid)] line-clamp-2">{course.description}</p>
      )}

      <span className="mt-auto font-body text-xs font-semibold text-[var(--terracota)] group-hover:underline">
        Ver capacitación →
      </span>
    </Link>
  );
}