// src/components/shared/GDrivePlayer.jsx
import React from "react";

export default function GDrivePlayer({ driveId, title }) {
  if (!driveId) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-[var(--border-warm)] bg-[var(--bg-page)] text-gray-500">
        <span className="mb-2 text-3xl">📭</span>
        <p className="font-body text-sm">No hay video disponible para esta capacitación.</p>
      </div>
    );
  }

  // URL mágica de Google Drive para incrustar el reproductor nativo
  const embedUrl = `https://drive.google.com/file/d/${driveId}/preview`;

  return (
    <div className="flex flex-col gap-3">
      {/* Contenedor del Iframe con proporción 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border-warm)] bg-black shadow-md">
        <iframe
          src={embedUrl}
          title={title || "Reproductor de capacitación"}
          className="absolute left-0 top-0 h-full w-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>

      {/* Botón de respaldo por si el navegador bloquea el Iframe por seguridad de cookies */}
      <div className="flex justify-end">
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-xs text-[var(--brown-mid)] hover:text-[var(--terracota)] hover:underline flex items-center gap-1"
        >
          <span>🔗</span> ¿No carga el video? Ábrelo en una nueva pestaña
        </a>
      </div>
    </div>
  );
}