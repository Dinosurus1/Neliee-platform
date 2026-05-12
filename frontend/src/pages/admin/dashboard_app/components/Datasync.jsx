import { useEffect, useState, useMemo } from 'react';
import api from '../../../../api/dashboardService';
import ModalArchivo from './ModalArchivo';
import { calcPrecioOrden, COP } from '../utils/finanzas';

const ESTADOS = ['Pendiente', 'En proceso', 'Listo', 'Entregado', 'Cancelado'];

const SELECT_COLOR = {
  'Pendiente':  '#92400E',
  'En proceso': '#1D4ED8',
  'Listo':      '#065F46',
  'Entregado':  '#475569',
  'Cancelado':  '#991B1B',
};
const SELECT_BG = {
  'Pendiente':  '#FEF3C7',
  'En proceso': '#EFF6FF',
  'Listo':      '#ECFDF5',
  'Entregado':  '#F8FAFC',
  'Cancelado':  '#FEF2F2',
};

const FILTROS = [
  { label: 'Todas',   value: 'all'   },
  { label: 'Hoy',     value: '1'     },
  { label: '7 días',  value: '7'     },
  { label: '30 días', value: '30'    },
  { label: 'Rango',   value: 'range' },
];

// ─── Helpers de fecha ────────────────────────────────────────────────────
const parseUTC = (str) => {
  if (!str) return null;
  if (str.endsWith('Z') || str.includes('+') || /\d{2}-\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }
  return new Date(str + 'Z');
};

const localMidnight = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const localEndOfDay = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
};

const formatFecha = (str) => {
  const d = parseUTC(str);
  if (!d) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatFechaCorta = (str) => {
  const d = parseUTC(str);
  if (!d) return null;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

// ─── Modal de notas ──────────────────────────────────────────────────────
const ModalNotas = ({ orden, onCerrar }) => (
  <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCerrar()}>
    <div className="modal-box w-full mx-4" style={{ maxWidth: 460 }}>
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl text-xl"
            style={{ width: 40, height: 40, background: '#FEF3C7' }}>📝</div>
          <div>
            <h2 className="font-bold text-slate-800 text-base leading-tight">
              Notas — Orden #{orden.numero_orden ?? orden.id}
            </h2>
            <p className="text-xs text-slate-400">{orden.cliente?.nombre} · {orden.producto?.nombre}</p>
          </div>
        </div>
        <button onClick={onCerrar}
          className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-400">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Instrucciones / Notas
          </p>
          <div className="rounded-2xl p-4 text-sm text-slate-700 leading-relaxed"
            style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
            {orden.notas || <span className="text-slate-400 italic">Sin notas registradas.</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Cantidad</p>
            <p className="text-xl font-bold text-slate-800">
              {orden.cantidad ?? <span className="text-slate-300 text-sm font-normal">—</span>}
            </p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Entrega</p>
            <p className="text-sm font-semibold text-slate-700">
              {orden.fecha_entrega
                ? parseUTC(orden.fecha_entrega).toLocaleDateString(undefined, {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                : <span className="text-slate-300 font-normal">—</span>
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Celda de precio — editable inline ──────────────────────────────────
const CeldaPrecio = ({ orden, onPrecioActualizado }) => {
  const { precioUnitario, subtotal } = calcPrecioOrden(orden);
  const [editando, setEditando]     = useState(false);
  const [valor, setValor]           = useState('');
  const [guardando, setGuardando]   = useState(false);

  const esEntregado = orden.estado === 'Entregado';
  const esPendiente = ['Pendiente', 'En proceso', 'Listo'].includes(orden.estado);
  const colorSubtotal = esEntregado ? '#059669' : esPendiente ? '#D97706' : '#64748B';

  const iniciarEdicion = () => {
    setValor(precioUnitario != null ? String(precioUnitario) : '');
    setEditando(true);
  };

  const cancelar = () => setEditando(false);

  const guardar = async () => {
    const nuevo = valor.trim() === '' ? null : parseFloat(valor);
    if (nuevo !== null && isNaN(nuevo)) return;
    setGuardando(true);
    try {
      const { data } = await api.patch(`/ordenes/${orden.id}/precio`, {
        precio_unitario: nuevo,
      });
      onPrecioActualizado(data);
      setEditando(false);
    } catch (e) {
      console.error('Error al guardar precio:', e);
    } finally {
      setGuardando(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter')  guardar();
    if (e.key === 'Escape') cancelar();
  };

  if (editando) {
    return (
      <div className="flex items-center gap-1" style={{ minWidth: 130 }}>
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400"
            style={{ pointerEvents: 'none' }}>$</span>
          <input
            autoFocus
            type="number"
            min="0"
            step="100"
            value={valor}
            onChange={e => setValor(e.target.value)}
            onKeyDown={handleKey}
            placeholder="0"
            className="w-full text-xs font-semibold rounded-lg border pl-5 pr-2 py-1 outline-none"
            style={{ borderColor: '#F59E0B', background: '#FFFBEB', color: '#92400E' }}
            disabled={guardando}
          />
        </div>
        <button onClick={guardar} disabled={guardando}
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition px-1"
          title="Guardar (Enter)">
          {guardando ? '…' : '✓'}
        </button>
        <button onClick={cancelar}
          className="text-xs text-slate-300 hover:text-slate-500 transition px-0.5"
          title="Cancelar (Esc)">
          ✕
        </button>
      </div>
    );
  }

  // Vista normal — clic para editar
  if (subtotal === null) {
    return (
      <button
        onClick={iniciarEdicion}
        className="text-xs italic text-slate-300 hover:text-amber-500 transition group flex items-center gap-1"
        title="Clic para asignar precio"
      >
        Sin precio
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">✏️</span>
      </button>
    );
  }

  return (
    <button
      onClick={iniciarEdicion}
      className="text-left group space-y-0.5"
      title="Clic para editar precio"
    >
      <p className="font-bold text-sm leading-none flex items-center gap-1"
        style={{ color: colorSubtotal }}>
        {COP(subtotal)}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400">✏️</span>
      </p>
      <p className="text-[10px] text-slate-400 leading-none">
        {COP(precioUnitario)} × {orden.cantidad ?? 1}
        {orden.medida ? ` · ${orden.medida.etiqueta}` : ''}
      </p>
    </button>
  );
};

// ─── Componente principal ────────────────────────────────────────────────
const Datasync = ({ refreshTrigger = 0 }) => {
  const [ordenes, setOrdenes]           = useState([]);
  const [cambiando, setCambiando]       = useState(null);
  const [cargando, setCargando]         = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('all');
  const [rangoDesde, setRangoDesde]     = useState('');
  const [rangoHasta, setRangoHasta]     = useState('');
  const [ordenActiva, setOrdenActiva]   = useState(null);
  const [ordenNotas, setOrdenNotas]     = useState(null);

  const [confirmandoId, setConfirmandoId] = useState(null);
  const [borrando, setBorrando]           = useState(false);

  useEffect(() => { cargarOrdenes(); }, [refreshTrigger]);

  const cargarOrdenes = async () => {
    try {
      setCargando(true);
      const { data } = await api.get('/ordenes/');
      setOrdenes(data);
    } catch (error) {
      console.error('Error al traer los datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const cambiarEstado = async (ordenId, nuevoEstado) => {
    setCambiando(ordenId);
    try {
      const { data } = await api.patch(`/ordenes/${ordenId}/estado`, { estado: nuevoEstado });
      setOrdenes(prev => prev.map(o => o.id === data.id ? data : o));
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('No se pudo cambiar el estado.');
    } finally {
      setCambiando(null);
    }
  };

  const eliminarOrden = async (ordenId) => {
    setBorrando(true);
    try {
      // Soft delete: el backend devuelve la orden con estado "Cancelado"
      const { data } = await api.delete(`/ordenes/${ordenId}`);
      setOrdenes(prev => prev.map(o => o.id === data.id ? data : o));
      setConfirmandoId(null);
    } catch (error) {
      alert(error.response?.data?.detail || 'No se pudo cancelar la orden.');
    } finally {
      setBorrando(false);
    }
  };

  // Callback que actualiza la orden en el estado local tras editar el precio
  const handlePrecioActualizado = (ordenActualizada) => {
    setOrdenes(prev => prev.map(o => o.id === ordenActualizada.id ? ordenActualizada : o));
  };

  const ordenesFiltradas = useMemo(() => {
    if (filtroActivo === 'all') return ordenes;
    return ordenes.filter(o => {
      const fechaOrden = parseUTC(o.fecha_creacion);
      if (!fechaOrden) return false;
      if (filtroActivo === 'range') {
        const desde = rangoDesde ? localMidnight(rangoDesde) : null;
        const hasta = rangoHasta ? localEndOfDay(rangoHasta) : null;
        if (desde && fechaOrden < desde) return false;
        if (hasta && fechaOrden > hasta) return false;
        return true;
      }
      const dias = parseInt(filtroActivo, 10);
      const hoy = new Date();
      const limite = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1), 0, 0, 0, 0);
      return fechaOrden >= limite;
    });
  }, [ordenes, filtroActivo, rangoDesde, rangoHasta]);

  const totalVisible = useMemo(() =>
    ordenesFiltradas.reduce((acc, o) => {
      const { subtotal } = calcPrecioOrden(o);
      return acc + (subtotal ?? 0);
    }, 0),
  [ordenesFiltradas]);

  const archivoActivo = (orden) =>
    orden.archivos?.find(a => a.es_activo) || orden.archivos?.[0] || null;

  if (cargando) {
    return (
      <div className="space-y-3 p-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTROS.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroActivo(f.value)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={filtroActivo === f.value
              ? { background: '#0F172A', color: '#fff' }
              : { background: '#F1F5F9', color: '#64748B' }
            }
          >
            {f.label}
          </button>
        ))}

        {filtroActivo === 'range' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={rangoDesde}
              onChange={e => setRangoDesde(e.target.value)}
              className="input text-xs" style={{ padding: '6px 10px', width: 'auto' }} />
            <span className="text-xs text-slate-400">–</span>
            <input type="date" value={rangoHasta}
              onChange={e => setRangoHasta(e.target.value)}
              className="input text-xs" style={{ padding: '6px 10px', width: 'auto' }} />
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {totalVisible > 0 && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: '#ECFDF5', color: '#059669' }}>
              Σ {COP(totalVisible)}
            </span>
          )}
          <button onClick={cargarOrdenes}
            className="text-xs text-slate-400 hover:text-amber-600 transition">
            🔄 {ordenesFiltradas.length} orden{ordenesFiltradas.length !== 1 ? 'es' : ''}
          </button>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="overflow-x-auto">
        <table className="data-table min-w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Estado</th>
              <th>Precio</th>
              <th>Fecha</th>
              <th>Notas</th>
              <th>Archivo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ordenesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="flex flex-col items-center py-10 text-slate-400">
                    <span className="text-4xl mb-3">📭</span>
                    <p className="text-sm font-medium">
                      {ordenes.length === 0
                        ? 'No hay órdenes registradas'
                        : 'Sin órdenes en este período'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              ordenesFiltradas.map(orden => {
                const archivo    = archivoActivo(orden);
                const confirmando = confirmandoId === orden.id;

                return (
                  <tr key={orden.id} className="group">
                    <td>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: '#F1F5F9', color: '#64748B' }}>
                      #{orden.numero_orden ?? orden.id}
                      </span>
                    </td>

                    <td>
                      <p className="font-semibold text-slate-700 text-sm leading-tight">
                        {orden.cliente?.nombre || '—'}
                      </p>
                    </td>

                    <td>
                      <p className="text-sm text-slate-700 leading-tight max-w-[120px] truncate">
                        {orden.producto?.nombre || '—'}
                      </p>
                      {orden.medida && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {orden.medida.etiqueta}
                        </p>
                      )}
                    </td>

                    <td>
                      {orden.cantidad != null ? (
                        <span className="font-bold text-sm px-2.5 py-1 rounded-lg"
                          style={{ background: '#F1F5F9', color: '#0F172A' }}>
                          {orden.cantidad.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>

                    <td>
                      {cambiando === orden.id ? (
                        <span className="text-xs text-slate-400 italic">Guardando...</span>
                      ) : (
                        <select
                          value={orden.estado}
                          onChange={e => cambiarEstado(orden.id, e.target.value)}
                          style={{
                            background: SELECT_BG[orden.estado] || '#F8FAFC',
                            color: SELECT_COLOR[orden.estado] || '#475569',
                            border: 'none', fontSize: 11, fontWeight: 600,
                            borderRadius: 20, padding: '4px 10px',
                            cursor: 'pointer', outline: 'none',
                            appearance: 'none', WebkitAppearance: 'none',
                          }}
                        >
                          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      )}
                    </td>

                    {/* ── Precio — editable inline ── */}
                    <td>
                      <CeldaPrecio
                        orden={orden}
                        onPrecioActualizado={handlePrecioActualizado}
                      />
                    </td>

                    <td>
                      <p className="text-slate-500 text-sm">{formatFecha(orden.fecha_creacion)}</p>
                      {orden.fecha_entrega && (
                        <p className="text-xs text-amber-600 font-medium">
                          🗓 {formatFechaCorta(orden.fecha_entrega)}
                        </p>
                      )}
                    </td>

                    <td>
                      <button
                        onClick={() => setOrdenNotas(orden)}
                        title={orden.notas || 'Sin notas'}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={orden.notas
                          ? { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }
                          : { background: '#F8FAFC', color: '#CBD5E1' }
                        }
                      >
                        📝
                        {orden.notas
                          ? <span className="max-w-[60px] truncate">{orden.notas}</span>
                          : <span>—</span>
                        }
                      </button>
                    </td>

                    <td>
                      <button
                        onClick={() => setOrdenActiva(orden)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={archivo
                          ? { background: '#EFF6FF', color: '#3B82F6' }
                          : { background: '#F8FAFC', color: '#94A3B8', border: '1.5px dashed #CBD5E1' }
                        }
                      >
                        {archivo ? (
                          <>
                            ☁️ {archivo.nombre_archivo
                              ? archivo.nombre_archivo.length > 12
                                ? archivo.nombre_archivo.slice(0, 12) + '…'
                                : archivo.nombre_archivo
                              : 'Ver archivo'}
                            {orden.archivos?.length > 1 && (
                              <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                                v{archivo.version}
                              </span>
                            )}
                          </>
                        ) : <>⬆ Subir</>}
                      </button>
                    </td>

                    {/* ── Eliminar ── */}
                    <td className="pr-3">
                      {confirmando ? (
                        <div className="flex items-center gap-1.5 py-1 px-2 rounded-xl"
                          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                          <span className="text-xs text-red-600 font-semibold whitespace-nowrap">
                            ¿Cancelar?
                          </span>
                          <button
                            onClick={() => eliminarOrden(orden.id)}
                            disabled={borrando}
                            className="text-xs font-bold text-white px-2 py-0.5 rounded-lg disabled:opacity-50"
                            style={{ background: '#EF4444' }}
                          >
                            {borrando ? '…' : 'Sí'}
                          </button>
                          <button
                            onClick={() => setConfirmandoId(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 transition px-1"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmandoId(orden.id)}
                          title="Cancelar orden"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 4h10M5 4V2h4v2M4 4l.5 8h5l.5-8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {ordenActiva && (
        <ModalArchivo
          orden={ordenActiva}
          onCerrar={() => setOrdenActiva(null)}
          onActualizar={(ordenActualizada) => {
            setOrdenes(prev => prev.map(o => o.id === ordenActualizada.id ? ordenActualizada : o));
            setOrdenActiva(ordenActualizada);
          }}
        />
      )}

      {ordenNotas && (
        <ModalNotas orden={ordenNotas} onCerrar={() => setOrdenNotas(null)} />
      )}
    </div>
  );
};

export default Datasync;