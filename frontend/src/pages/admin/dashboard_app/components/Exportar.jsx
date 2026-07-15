import { useState } from "react";
import api, { descargarConAuth } from "../../../../api/dashboardService";

/**
 * Cambios de esta revisión:
 *
 * 1. "Descargar Excel" y "Descargar Backup" usaban
 *    window.open(buildDownloadUrl(...)). Ahora que el ERP exige el header
 *    Authorization en todas sus rutas (antes no exigía nada — ver
 *    backend/app/core/security.py del ERP), abrir la URL en una pestaña
 *    nueva ya no funciona: el navegador no manda headers custom en una
 *    navegación simple, así que el backend respondía 401. Se reemplazó por
 *    descargarConAuth(), que pide el archivo vía axios (sí manda el header)
 *    como blob y dispara la descarga.
 *
 * 2. "Backup de Base de Datos" apuntaba a /exportar/db, que no existía
 *    (daba 404). Ahora existe: genera un dump real de PostgreSQL con
 *    pg_dump (.sql), no un archivo .db — el texto se actualizó para
 *    reflejar eso.
 *
 * 3. Se quitó la tarjeta "Restaurar Base de Datos". Llamaba a
 *    /exportar/importar-db, que tampoco existía, y aunque hubiera existido:
 *    un botón público que reemplaza la base de datos completa desde un
 *    archivo subido es un riesgo severo incluso detrás de autenticación
 *    (una sesión de admin comprometida, o un solo click equivocado, borra
 *    toda la data de producción). Restaurar un backup debe ser una
 *    operación manual desde el servidor, no un botón del dashboard — se
 *    reemplazó por una tarjeta informativa con el comando correcto.
 */

const ActionCard = ({ icon, title, description, children }) => (
  <div
    className="rounded-2xl p-5"
    style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}
  >
    <div className="flex items-center gap-3 mb-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-slate-700 text-sm">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const Exportar = () => {
  const [descargando, setDescargando] = useState(null); // null | 'excel' | 'db'
  const [mensaje, setMensaje] = useState("");
const descargarExcel = async () => {
  setDescargando("excel");
  setMensaje("");
  try {
    await descargarConAuth("/exportar/excel", "Neliee.xlsx");
  } catch (err) {
    setMensaje({ tipo: "error", texto: err.detail || "Error al descargar el Excel." });
  } finally {
    setDescargando(null);
  }
};

const descargarBackup = async () => {
  setDescargando("db");
  setMensaje("");
  try {
    await descargarConAuth("/exportar/db", "neliee_backup.sql");
  } catch (err) {
    const detalle = err.response?.status === 501
      ? "pg_dump no está instalado en el servidor. Contactá al administrador del sistema."
      : err.detail || "Error al generar el backup.";
    setMensaje({ tipo: "error", texto: detalle });
  } finally {
    setDescargando(null);
  }
};

  return (
    <div className="card p-6">
      <div
        className="flex items-center gap-3 mb-6 pb-4"
        style={{ borderBottom: "1px solid #F1F5F9" }}
      >
        <div
          className="flex items-center justify-center rounded-xl text-xl"
          style={{ width: 44, height: 44, background: "#FEF3C7" }}
        >
          📦
        </div>
        <div>
          <h2 className="font-bold text-slate-800">Exportar</h2>
          <p className="text-xs text-slate-400">Gestión de datos y backups</p>
        </div>
      </div>

      <div className="space-y-4">
        <ActionCard
          icon="📊"
          title="Exportar a Excel"
          description="Clientes, Productos y Órdenes en un archivo .xlsx"
        >
          <button
            onClick={descargarExcel}
            disabled={descargando === "excel"}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: "#059669" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#047857")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#059669")}
          >
            {descargando === "excel" ? "⏳ Generando..." : "⬇ Descargar Excel"}
          </button>
        </ActionCard>

        <ActionCard
          icon="💾"
          title="Backup de Base de Datos"
          description="Dump completo de PostgreSQL (.sql) con pg_dump"
        >
          <button
            onClick={descargarBackup}
            disabled={descargando === "db"}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: "#2563EB" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1D4ED8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2563EB")}
          >
            {descargando === "db" ? "⏳ Generando..." : "⬇ Descargar Backup (.sql)"}
          </button>
        </ActionCard>

        <ActionCard
          icon="🔒"
          title="Restaurar Base de Datos"
          description="No disponible desde el dashboard, a propósito"
        >
          <div
            className="rounded-xl p-3 text-xs leading-relaxed"
            style={{ background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }}
          >
            <p className="mb-2">
              Restaurar un backup reemplaza <strong>toda</strong> la base de datos actual.
              Por eso no es un botón del dashboard — es una operación manual desde el
              servidor, con acceso directo a la base de datos:
            </p>
            <code className="block px-2 py-1.5 rounded-lg text-[11px]" style={{ background: "#1a140f", color: "#f8d7b4" }}>
              psql "$DATABASE_URL" &lt; neliee_backup.sql
            </code>
            <p className="mt-2">Pedile este paso a quien administre el servidor.</p>
          </div>
        </ActionCard>

        {mensaje && (
          <div
            className="text-xs p-3 rounded-xl flex items-start gap-2"
            style={{
              background: mensaje.tipo === "ok" ? "#ECFDF5" : "#FEF2F2",
              color: mensaje.tipo === "ok" ? "#065F46" : "#991B1B",
            }}
          >
            <span>{mensaje.tipo === "ok" ? "✅" : "❌"}</span>
            <span>{mensaje.texto}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exportar;