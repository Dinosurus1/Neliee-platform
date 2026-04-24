// src/components/shared/GDrivePlayer.jsx
/**
 * Reproductor de video de Google Drive.
 *
 * Uso:
 *   <GDrivePlayer driveId="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" title="Clase 1" />
 *
 * El endpoint /preview de Drive no requiere autenticación si el archivo
 * está compartido "Cualquiera con el enlace puede ver".
 */

import { useState } from "react";

const GDRIVE_EMBED_BASE = "https://drive.google.com/file/d";

export default function GDrivePlayer({ driveId, title = "Capacitación" }) {
  const [isLoading, setIsLoading] = useState(true);

  if (!driveId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-cyan-500/20 bg-gray-900 text-gray-500">
        <p className="text-sm">Sin video asignado.</p>
      </div>
    );
  }

  const src = `${GDRIVE_EMBED_BASE}/${driveId}/preview`;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-gray-950 shadow-lg shadow-cyan-500/10">
      {/* Skeleton loader mientras carga el iframe */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-cyan-400" />
        </div>
      )}

      <iframe
        src={src}
        title={title}
        allow="autoplay; encrypted-media"
        allowFullScreen
        className="aspect-video w-full"
        onLoad={() => setIsLoading(false)}
        // Seguridad: evita que el iframe ejecute scripts en el origen del sitio
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}