import { useState, useEffect, useRef } from 'react';
import api from '../../../../api/dashboardService';

/**
 * ModalArchivo
 * Se abre al hacer clic en la celda "Archivo" de una orden.
 * Permite: ver archivo activo, subir nuevo, reemplazar, ver historial.
 */
const ModalArchivo = ({ orden, onCerrar, onActualizar }) => {
  const [historial, setHistorial]       = useState([]);
  const [cargandoH, setCargandoH]       = useState(true);
  const [subiendo, setSubiendo]         = useState(false);
  const [motivo, setMotivo]             = useState('');
  const [archivoSel, setArchivoSel]     = useState(null);
  const [error, setError]               = useState('');
  const [exito, setExito]               = useState('');
  const inputRef                        = useRef(null);

  const archivoActivo = orden.archivos?.find(a => a.es_activo) || orden.archivos?.[0] || null;
  const esReemplazo   = !!archivoActivo;

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setCargandoH(true);
    try {
      const { data } = await api.get(`/ordenes/${orden.id}/historial`);
      setHistorial(data);
    } catch (e) {
      // Sin historial previo — no es error
      setHistorial([]);
    } finally {
      setCargandoH(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setArchivoSel(f);
    setError('');
    setExito('');
  };

  const handleSubir = async () => {
    if (!archivoSel) {
      setError('Seleccioná un archivo primero.');
      return;
    }
    if (esReemplazo && !motivo.trim()) {
      setError('Ingresá el motivo del reemplazo.');
      return;
    }

    setSubiendo(true);
    setError('');
    setExito('');

    const form = new FormData();
    form.append('archivo', archivoSel);
    if (motivo.trim()) form.append('motivo_cambio', motivo.trim());

    try {
      const { data } = await api.post(`/ordenes/${orden.id}/archivo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setExito(esReemplazo
        ? '✅ Archivo reemplazado y versión anterior guardada en el historial.'
        : '✅ Archivo subido a OneDrive y vinculado a la orden.');
      setArchivoSel(null);
      setMotivo('');
      if (inputRef.current) inputRef.current.value = '';
      await cargarHistorial();
      if (onActualizar) onActualizar(data);
    } catch (err) {
      const detalle = err.response?.data?.detail || 'Error al subir el archivo a OneDrive.';
      setError(`❌ ${detalle}`);
    } finally {
      setSubiendo(false);
    }
  };

  const formatFecha = (iso) =>
    new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div
      className="modal-backdrop"
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="modal-box w-full mx-4" style={{ maxWidth: 560 }}>

        {/* ── Header ───────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl text-xl"
              style={{ width: 40, height: 40, background: '#EFF6FF' }}
            >
              ☁️
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base leading-tight">
                Archivo — Orden #{orden.id}
              </h2>
              <p className="text-xs text-slate-400">
                {orden.cliente?.nombre} · {orden.producto?.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-400"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: '75vh' }}>

          {/* ── Archivo activo ───────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Archivo activo en OneDrive
            </p>
            {archivoActivo ? (
              <div
                className="rounded-2xl p-4 flex items-start justify-between gap-3"
                style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC' }}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-800 text-sm truncate">
                    📄 {archivoActivo.nombre_archivo || 'Archivo sin nombre'}
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Versión {archivoActivo.version} · vinculado el{' '}
                    {formatFecha(archivoActivo.fecha_vinculacion)}
                  </p>
                </div>
                <a
                  href={archivoActivo.onedrive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                  style={{ background: '#DCFCE7', color: '#166534' }}
                >
                  Abrir ↗
                </a>
              </div>
            ) : (
              <div
                className="rounded-2xl p-4 text-center"
                style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1' }}
              >
                <p className="text-sm text-slate-400">Esta orden no tiene archivo vinculado aún.</p>
              </div>
            )}
          </div>

          {/* ── Subir / Reemplazar ───────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              {esReemplazo ? 'Reemplazar archivo' : 'Subir archivo a OneDrive'}
            </p>

            {esReemplazo && (
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Motivo del reemplazo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={e => { setMotivo(e.target.value); setError(''); }}
                  placeholder="Ej: Cliente solicitó cambio de logo"
                  className="input"
                />
              </div>
            )}

            {/* Drop zone */}
            <label
              className="flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all py-8 px-4 text-center"
              style={{
                border: archivoSel ? '2px solid #D97706' : '2px dashed #CBD5E1',
                background: archivoSel ? '#FFFBEB' : '#FAFAFA',
              }}
              onMouseEnter={e => { if (!archivoSel) e.currentTarget.style.borderColor = '#F59E0B'; }}
              onMouseLeave={e => { if (!archivoSel) e.currentTarget.style.borderColor = '#CBD5E1'; }}
            >
              {archivoSel ? (
                <div className="space-y-1">
                  <p className="text-2xl">📄</p>
                  <p className="font-semibold text-amber-800 text-sm">{archivoSel.name}</p>
                  <p className="text-xs text-amber-600">
                    {(archivoSel.size / 1024).toFixed(1)} KB · Listo para subir
                  </p>
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setArchivoSel(null); if (inputRef.current) inputRef.current.value = ''; }}
                    className="text-xs text-amber-500 hover:text-red-500 transition mt-1"
                  >
                    ✕ quitar
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-3xl">☁️</p>
                  <p className="font-semibold text-slate-500 text-sm">
                    Hacé clic o arrastrá un archivo
                  </p>
                  <p className="text-xs text-slate-400">PDF, AI, PSD, PNG, JPG, etc.</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {/* Feedback */}
            {error && (
              <div
                className="mt-3 text-xs p-3 rounded-xl"
                style={{ background: '#FEF2F2', color: '#991B1B' }}
              >
                {error}
              </div>
            )}
            {exito && (
              <div
                className="mt-3 text-xs p-3 rounded-xl"
                style={{ background: '#ECFDF5', color: '#065F46' }}
              >
                {exito}
              </div>
            )}

            <button
              onClick={handleSubir}
              disabled={subiendo || !archivoSel}
              className="btn-primary w-full mt-3"
            >
              {subiendo
                ? '⏳ Subiendo a OneDrive...'
                : esReemplazo
                  ? '🔄 Reemplazar en OneDrive'
                  : '⬆ Subir a OneDrive'}
            </button>

            {esReemplazo && (
              <p className="text-xs text-slate-400 text-center mt-2">
                La versión anterior quedará guardada en el historial
              </p>
            )}
          </div>

          {/* ── Historial de versiones ───────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Historial de versiones
            </p>

            {cargandoH ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
              </div>
            ) : historial.length === 0 ? (
              <div
                className="rounded-2xl p-4 text-center"
                style={{ background: '#F8FAFC' }}
              >
                <p className="text-xs text-slate-400">Sin cambios de archivo registrados.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historial.map((h, idx) => (
                  <div
                    key={h.id}
                    className="rounded-2xl p-4"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs font-bold text-slate-500">
                          Cambio #{historial.length - idx}
                          {h.motivo_cambio && (
                            <span className="ml-2 font-normal text-slate-400 italic">
                              "{h.motivo_cambio}"
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatFecha(h.fecha_cambio)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={h.url_anterior}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-center px-2 py-1.5 rounded-lg font-medium transition"
                        style={{ background: '#FEF3C7', color: '#92400E' }}
                      >
                        📄 Versión anterior
                      </a>
                      <a
                        href={h.url_nueva}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-center px-2 py-1.5 rounded-lg font-medium transition"
                        style={{ background: '#EFF6FF', color: '#1D4ED8' }}
                      >
                        📄 Versión nueva
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ModalArchivo;