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
  const { courseId } = useParams(); // courseId = enrollmentId
  const { data: enrollments, isLoading } = useApi(getMyEnrollments);
  const [marking, setMarking] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const enrollment = enrollments?.find((e) => e.id === courseId);

  if (!enrollment) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
        <span className="text-4xl">🔒</span>
        <p className="text-gray-400">Capacitación no encontrada o sin acceso.</p>
        <Link to="/dashboard" className="btn-outline">
          ← Volver al dashboard
        </Link>
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
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header de navegación */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link
            to="/dashboard"
            className="text-sm text-gray-500 hover:text-cyan-400 transition-colors"
          >
            ← Mis capacitaciones
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-gray-300 line-clamp-1">{course.title}</span>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8 animate-fade-in">
        {/* Título y estado */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-100">
              {course.title}
            </h1>
            {course.description && (
              <p className="mt-2 text-sm text-gray-500 max-w-xl">{course.description}</p>
            )}
          </div>
          <Badge variant={completed ? "green" : "gray"}>
            {completed ? "✓ Completada" : "En progreso"}
          </Badge>
        </div>

        <div className="divider-neon mb-8" />

        {/* Reproductor */}
        <GDrivePlayer driveId={course.gdrive_video_id} title={course.title} />

        {/* Acción de completar */}
        {!completed && (
          <div className="mt-8 flex items-center justify-center">
            <Button
              onClick={handleComplete}
              isLoading={marking}
              className="px-8"
            >
              ✓ Marcar como completada
            </Button>
          </div>
        )}

        {completed && (
          <div className="mt-8 card flex items-center gap-3 bg-green-500/5 border-green-500/20">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-green-400">¡Capacitación completada!</p>
              <p className="text-xs text-gray-500">Puedes volver a verla cuando quieras.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}