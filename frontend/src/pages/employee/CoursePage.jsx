// src/pages/employee/CoursePage.jsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { getMyEnrollments, markCourseComplete } from "../../api/courseService";
import GDrivePlayer from "../../components/shared/GDrivePlayer";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";

export default function CoursePage() {
  const { courseId } = useParams();
  const { data: enrollments, isLoading } = useApi(getMyEnrollments);
  const [marking, setMarking] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>
    );
  }

  const enrollment = enrollments?.find((e) => e.id === courseId);

  if (!enrollment) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
        <span className="text-5xl">🔒</span>
        <p className="font-body text-[var(--brown-mid)]">Capacitación no encontrada o sin acceso.</p>
        <Link to="/dashboard" className="btn-outline">← Volver al dashboard</Link>
      </div>
    );
  }

  const { course, completed } = enrollment;

  async function handleComplete() {
    if (completed) return;
    setMarking(true);
    try {
      await markCourseComplete(enrollment.id);
      window.location.reload();
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      {/* Breadcrumb */}
      <div className="border-b bg-white px-6 py-4" style={{ borderColor: "var(--border-warm)" }}>
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link to="/dashboard" className="font-body text-sm text-[var(--brown-mid)] hover:text-[var(--terracota)] transition-colors">
            ← Mis capacitaciones
          </Link>
          <span className="text-[var(--border-warm)]">/</span>
          <span className="font-body text-sm text-[var(--brown-dark)] line-clamp-1">{course.title}</span>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8 animate-fade-in">
        {/* Título y estado */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--brown-dark)]">{course.title}</h1>
            {course.description && (
              <p className="mt-2 font-body text-sm text-[var(--brown-mid)] max-w-xl">{course.description}</p>
            )}
          </div>
          <Badge variant={completed ? "green" : "gray"}>
            {completed ? "✓ Completada" : "En progreso"}
          </Badge>
        </div>

        <div className="divider-gold mb-8" />

        {/* Reproductor */}
        <GDrivePlayer driveId={course.gdrive_video_id} title={course.title} />

        {/* Acción */}
        {!completed ? (
          <div className="mt-8 flex items-center justify-center">
            <Button onClick={handleComplete} isLoading={marking} className="px-10">
              ✓ Marcar como completada
            </Button>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border p-5 flex items-center gap-4"
            style={{ background: "rgba(75,93,5,0.06)", borderColor: "rgba(75,93,5,0.2)" }}>
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-display text-base font-semibold" style={{ color: "var(--olive)" }}>
                ¡Capacitación completada!
              </p>
              <p className="font-body text-sm text-[var(--brown-mid)]">Puedes volver a verla cuando quieras.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}