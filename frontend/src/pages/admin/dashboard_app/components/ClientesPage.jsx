import { useState, useEffect, useMemo } from 'react';
import api from '../../../../api/dashboardService';
import { calcPrecioOrden, COP } from '../utils/finanzas';

const parseUTC = (str) => {
  if (!str) return null;
  if (str.endsWith('Z') || str.includes('+')) return new Date(str);
  return new Date(str + 'Z');
};

const ESTADO_STYLE = {
  'Pendiente':  { bg: 'rgba(253,230,138,0.22)', color: '#92400E' },
  'En proceso': { bg: 'rgba(59,130,246,0.14)', color: '#1D4ED8' },
  'Listo':      { bg: 'rgba(16,185,129,0.16)', color: '#065F46' },
  'Entregado':  { bg: 'rgba(148,205,166,0.15)', color: '#475569' },
  'Cancelado':  { bg: 'rgba(248,113,113,0.18)', color: '#991B1B' },
};

// ── Panel derecho ─────────────────────────────────────────────────────────
const PanelCliente = ({ cliente, ordenes, cargandoOrdenes }) => {
  const [vistaTab, setVistaTab] = useState('historial');

  const stats = useMemo(() => {
    if (!ordenes.length) return null;
    let totalCobrado = 0;
    let totalDeuda   = 0;
    let sinPrecio    = 0;

    ordenes.forEach(o => {
      const { subtotal } = calcPrecioOrden(o);
      if (subtotal === null) { sinPrecio++; return; }
      if (o.estado === 'Entregado') totalCobrado += subtotal;
      else if (['Pendiente', 'En proceso', 'Listo'].includes(o.estado)) totalDeuda += subtotal;
    });

    return { totalCobrado, totalDeuda, sinPrecio, total: totalCobrado + totalDeuda };
  }, [ordenes]);

  // Agrupar por producto para la pestaña "Por producto"
  const porProducto = useMemo(() => {
    const map = {};
    ordenes.forEach(o => {
      const nombre = o.producto?.nombre || '—';
      if (!map[nombre]) map[nombre] = { nombre, categoria: o.producto?.categoria, ordenes: [] };
      map[nombre].ordenes.push(o);
    });
    return Object.values(map).sort((a, b) => b.ordenes.length - a.ordenes.length);
  }, [ordenes]);

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Info del cliente ── */}
      <div className="bg-[#2a1f16] rounded-2xl shadow-sm border border-[rgba(192,150,107,0.16)] p-6 mb-4">
        <div className="flex items-start gap-4 pb-5 mb-5" style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
          <div className="flex items-center justify-center rounded-2xl text-2xl font-bold flex-shrink-0"
            style={{ width: 64, height: 64, background: '#FEF3C7', color: '#D97706' }}>
            {cliente.nombre[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[#f8d7b4] text-2xl">{cliente.nombre}</h3>
              {cliente.es_cliente_regular && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: '#FEF3C7', color: '#92400E' }}>
                  ⭐ Cliente regular
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-5 mt-2 text-sm text-[#d6c0a5]">
              {cliente.email    && <span>✉️ {cliente.email}</span>}
              {cliente.telefono && <span>📞 {cliente.telefono}</span>}
              {cliente.fecha_creacion && (
                <span>📅 Desde {parseUTC(cliente.fecha_creacion)?.toLocaleDateString('es-CO', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}</span>
              )}
            </div>
          </div>
        </div>

        {/* KPIs financieros */}
        {!cargandoOrdenes && stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 text-center"
              style={{ background: '#152e25', border: '1.5px solid rgba(16,185,129,0.24)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">Cobrado</p>
              <p className="font-bold text-lg text-emerald-200 leading-none">{COP(stats.totalCobrado)}</p>
              <p className="text-xs text-emerald-300 mt-1">
                {ordenes.filter(o => o.estado === 'Entregado').length} entregadas
              </p>
            </div>
            <div className="rounded-2xl p-4 text-center"
              style={{ background: '#2e1e0f', border: '1.5px solid rgba(253,230,138,0.28)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">Por cobrar</p>
              <p className="font-bold text-lg text-amber-200 leading-none">{COP(stats.totalDeuda)}</p>
              <p className="text-xs text-amber-300 mt-1">
                {ordenes.filter(o => ['Pendiente','En proceso','Listo'].includes(o.estado)).length} activas
              </p>
            </div>
            <div className="rounded-2xl p-4 text-center"
              style={{ background: '#241b13', border: '1.5px solid rgba(226,232,240,0.16)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#d6c0a5] mb-1">Total acumulado</p>
              <p className="font-bold text-lg text-[#f8d7b4] leading-none">{COP(stats.total)}</p>
              <p className="text-xs text-[#d6c0a5] mt-1">{ordenes.length} órdenes</p>
            </div>
          </div>
        )}
        {!cargandoOrdenes && stats === null && ordenes.length === 0 && (
          <p className="text-sm text-[#c7a17d] text-center py-4">Sin órdenes registradas.</p>
        )}
        {!cargandoOrdenes && stats?.sinPrecio > 0 && (
          <p className="text-xs text-[#c7a17d] mt-3 text-center">
            ⚠️ {stats.sinPrecio} órdenes sin precio asignado no están incluidas en los totales.
          </p>
        )}
        {cargandoOrdenes && (
          <div className="grid grid-cols-3 gap-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl" style={{ background: '#241b13' }} />)}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      {ordenes.length > 0 && (
        <div className="rounded-2xl shadow-sm border border-[rgba(192,150,107,0.16)] overflow-hidden bg-[#261b11]">
          <div className="flex" style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
            {[
              { id: 'historial', label: '🧾 Historial de compras' },
              { id: 'productos', label: '📦 Por producto' },
            ].map(t => (
              <button key={t.id} onClick={() => setVistaTab(t.id)}
                className="flex-1 py-3.5 text-sm font-semibold transition-all"
                style={vistaTab === t.id
                  ? { borderBottom: '2px solid #D97706', color: '#f8d7b4', background: '#3b2a1d' }
                  : { color: '#c7a17d' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Historial ── */}
          {vistaTab === 'historial' && (
            <div className="overflow-x-auto">
              {cargandoOrdenes ? (
                <div className="p-6 space-y-3 animate-pulse">
                  {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl" style={{ background: '#241b13' }} />)}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'rgba(79,63,52,0.35)', borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
                      {['#', 'Producto', 'Medida', 'Cant.', 'P. Unit.', 'Total', 'Estado', 'Fecha'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-[#c7a17d]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ordenes.map(o => {
                      // ✅ calcPrecioOrden usa orden.precio_unitario directamente
                      const { precioUnitario, subtotal } = calcPrecioOrden(o);
                      const esEntregado = o.estado === 'Entregado';
                      const estStyle    = ESTADO_STYLE[o.estado] || ESTADO_STYLE['Pendiente'];

                      return (
                        <tr key={o.id}
                          className="transition-colors"
                          style={{ borderBottom: '1px solid rgba(192,150,107,0.12)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,175,107,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td className="py-3 px-4">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: '#3b2a1d', color: '#d6c0a5' }}>
                              #{o.id}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#f8d7b4] max-w-[120px]">
                            <p className="truncate">{o.producto?.nombre || '—'}</p>
                            {o.producto?.categoria && (
                              <p className="text-xs text-[#c7a17d] capitalize">{o.producto.categoria}</p>
                            )}
                          </td>
                          {/* ✅ medida viene directo de orden.medida (relación del backend) */}
                          <td className="py-3 px-4 text-xs text-[#c7a17d]">
                            {o.medida?.etiqueta
                              ? o.medida.etiqueta
                              : <span className="italic text-slate-300">—</span>
                            }
                          </td>
                          <td className="py-3 px-4 text-[#d6c0a5] font-medium text-xs">
                            {o.cantidad ?? <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#c7a17d]">
                            {precioUnitario != null
                              ? COP(precioUnitario)
                              : <span className="italic text-slate-300">—</span>
                            }
                          </td>
                          <td className="py-3 px-4">
                            {subtotal != null ? (
                              <span className="font-bold text-sm"
                                style={{ color: esEntregado ? '#059669' : '#D97706' }}>
                                {COP(subtotal)}
                              </span>
                            ) : (
                              <span className="text-xs italic text-slate-300">Sin precio</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: estStyle.bg, color: estStyle.color }}>
                              {o.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-[#c7a17d] whitespace-nowrap">
                            {parseUTC(o.fecha_creacion)?.toLocaleDateString('es-CO', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Fila de totales */}
                  {stats && (
                    <tfoot>
                      <tr style={{ background: 'rgba(79,63,52,0.35)', borderTop: '2px solid rgba(192,150,107,0.16)' }}>
                        <td colSpan={5} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-[#c7a17d] text-right">
                          Totales
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-emerald-600">
                              ✅ {COP(stats.totalCobrado)}
                            </p>
                            {stats.totalDeuda > 0 && (
                              <p className="text-xs font-bold text-amber-600">
                                ⏳ {COP(stats.totalDeuda)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          )}

          {/* ── Tab: Por producto ── */}
          {vistaTab === 'productos' && (
            <div className="p-5 space-y-3">
              {cargandoOrdenes ? (
                <div className="space-y-3 animate-pulse">
                  {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl" style={{ background: '#241b13' }} />)}
                </div>
              ) : (
                porProducto.map((grupo, idx) => {
                  const totalGrupo = grupo.ordenes.reduce((s, o) => {
                    const { subtotal } = calcPrecioOrden(o);
                    return s + (subtotal ?? 0);
                  }, 0);
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  const maxTotal = porProducto[0]
                    ? porProducto[0].ordenes.reduce((s, o) => s + (calcPrecioOrden(o).subtotal ?? 0), 0)
                    : 1;
                  const pct = maxTotal > 0 ? Math.round((totalGrupo / maxTotal) * 100) : 0;

                  return (
                    <div key={grupo.nombre} className="rounded-2xl p-4"
                      style={{
                        background: idx === 0 ? '#2e1e0f' : '#241b13',
                        border: `1px solid ${idx === 0 ? 'rgba(253,230,138,0.28)' : 'rgba(226,232,240,0.16)'}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">{medal}</span>
                          <div className="min-w-0">
                            <span className="font-semibold text-[#f8d7b4] text-sm truncate block">
                              {grupo.nombre}
                            </span>
                            {grupo.categoria && (
                              <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                                style={{ background: 'rgba(59,130,246,0.14)', color: '#93c5fd' }}>
                                {grupo.categoria}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold text-sm text-[#f8d7b4]">
                            {grupo.ordenes.length} {grupo.ordenes.length === 1 ? 'orden' : 'órdenes'}
                          </p>
                          {totalGrupo > 0 && (
                            <p className="text-xs font-bold text-amber-600">{COP(totalGrupo)}</p>
                          )}
                        </div>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'rgba(226,232,240,0.16)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: idx === 0 ? '#D97706' : '#93C5FD' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────
const ClientesPage = () => {
  const [clientes, setClientes]                 = useState([]);
  const [clienteActivo, setClienteActivo]       = useState(null);
  const [ordenes, setOrdenes]                   = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [cargandoOrdenes, setCargandoOrdenes]   = useState(false);

  const [filtroDia, setFiltroDia]   = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const [eliminandoId, setEliminandoId]   = useState(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [borrando, setBorrando]           = useState(false);

  useEffect(() => {
    api.get('/clientes/')
      .then(r => setClientes(r.data))
      .catch(console.error)
      .finally(() => setCargandoClientes(false));
  }, []);

  const clientesFiltrados = useMemo(() => {
    let r = clientes;
    if (filtroTipo === 'regulares') r = r.filter(c => c.es_cliente_regular);
    if (filtroTipo === 'normales')  r = r.filter(c => !c.es_cliente_regular);
    if (filtroDia) {
      r = r.filter(c => {
        if (!c.fecha_creacion) return false;
        const d = new Date(c.fecha_creacion + (c.fecha_creacion.endsWith('Z') ? '' : 'Z'));
        return d.toISOString().slice(0, 10) === filtroDia;
      });
    }
    return r;
  }, [clientes, filtroDia, filtroTipo]);

  const seleccionarCliente = async (cliente) => {
    setClienteActivo(cliente);
    setOrdenes([]);
    setEliminandoId(null);
    setErrorEliminar('');
    setCargandoOrdenes(true);
    try {
      const { data } = await api.get(`/ordenes/?cliente_id=${cliente.id}`);
      setOrdenes(data);
    } catch (e) { console.error(e); }
    finally { setCargandoOrdenes(false); }
  };

  const confirmarEliminar = (e, clienteId) => {
    e.stopPropagation();
    setEliminandoId(clienteId);
    setErrorEliminar('');
  };
  const cancelarEliminar = (e) => {
    e.stopPropagation();
    setEliminandoId(null);
    setErrorEliminar('');
  };

  const ejecutarEliminar = async (e, cliente) => {
    e.stopPropagation();
    setBorrando(true);
    try {
      await api.delete(`/clientes/${cliente.id}`);
      setClientes(prev => prev.filter(c => c.id !== cliente.id));
      if (clienteActivo?.id === cliente.id) { setClienteActivo(null); setOrdenes([]); }
      setEliminandoId(null);
    } catch (err) {
      setErrorEliminar(err.response?.data?.detail || 'No se pudo eliminar el cliente.');
    } finally { setBorrando(false); }
  };

  return (
    <div className="flex flex-col bg-[#1a140f] rounded-2xl shadow-sm border border-[rgba(192,150,107,0.16)] overflow-hidden"
      style={{ height: 'calc(100vh - 5rem)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl text-xl"
            style={{ width: 40, height: 40, background: '#D97706', color: '#fff' }}>👥</div>
          <h2 className="font-bold text-[#f8d7b4] text-lg">Gestión de Clientes</h2>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Lista izquierda ── */}
        <div className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: 300, borderRight: '1px solid rgba(192,150,107,0.16)' }}>

          {/* Filtro tipo */}
          <div className="px-3 py-2.5 flex gap-1.5" style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
            {[
              { value: 'todos',     label: 'Todos' },
              { value: 'regulares', label: '⭐ Regulares' },
              { value: 'normales',  label: 'Normales' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setFiltroTipo(opt.value)}
                className="flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all"
                style={filtroTipo === opt.value
                  ? { background: '#0F172A', color: '#fff' }
                  : { background: '#2a1f16', color: '#c7a17d' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filtro fecha */}
          <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
            <label className="text-xs font-bold uppercase tracking-wider text-[#d6c0a5] mb-1.5 block">
              Filtrar por fecha de registro
            </label>
            <div className="flex gap-1.5 items-center">
              <input type="date" value={filtroDia} onChange={e => setFiltroDia(e.target.value)}
                className="border rounded flex-1 text-xs bg-[#2a1f16] text-[#f8d7b4] border-[rgba(192,150,107,0.16)]" style={{ padding: '7px 10px' }} />
              {filtroDia && (
                <button onClick={() => setFiltroDia('')}
                  className="text-slate-300 hover:text-red-400 text-sm transition flex-shrink-0">
                  ✕
                </button>
              )}
            </div>
            <p className="text-xs text-[#c7a17d] mt-1.5">
              {clientesFiltrados.length} de {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {cargandoClientes ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#2a1f16' }} />)}
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#c7a17d]">
                {filtroDia ? 'Sin clientes ese día.' : 'No hay clientes registrados.'}
              </div>
            ) : (
              clientesFiltrados.map(c => (
                <div key={c.id}>
                  {eliminandoId !== c.id ? (
                    <button onClick={() => seleccionarCliente(c)}
                      className="w-full text-left px-4 py-3.5 transition-all group relative">
                      <div className="absolute inset-0 transition-all"
                        style={{
                          background: clienteActivo?.id === c.id ? 'rgba(253,230,138,0.12)' : 'transparent',
                          borderLeft: `3px solid ${clienteActivo?.id === c.id ? '#D97706' : 'transparent'}`,
                          borderBottom: '1px solid rgba(192,150,107,0.16)', zIndex: 0,
                        }} />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                            style={{
                              width: 32, height: 32,
                              background: clienteActivo?.id === c.id ? '#D97706' : '#3b2a1d',
                              color:      clienteActivo?.id === c.id ? '#fff'    : '#efaf6b',
                            }}>
                            {c.nombre[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#f8d7b4] text-sm truncate leading-tight">
                              {c.nombre}
                            </p>
                            {c.es_cliente_regular && (
                              <span className="text-[10px] font-bold text-[#f8d7b4]">⭐ Regular</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={ev => confirmarEliminar(ev, c.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 flex-shrink-0 ml-1"
                          title="Eliminar cliente"
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1.5 3.5h9M4 3.5V2h4v1.5M3 3.5l.5 7.5h5l.5-7.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </button>
                  ) : (
                    <div className="mx-3 my-1.5 p-3 rounded-xl"
                      style={{ background: '#3c1316', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <p className="text-xs font-semibold text-red-200 mb-1.5">
                        ¿Eliminar a <strong>{c.nombre}</strong>?
                      </p>
                      {errorEliminar
                        ? <p className="text-xs text-red-600 mb-2 leading-tight">{errorEliminar}</p>
                        : <p className="text-xs text-red-400 mb-2">Esta acción no se puede deshacer.</p>
                      }
                      <div className="flex gap-2">
                        <button onClick={ev => ejecutarEliminar(ev, c)} disabled={borrando}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                          style={{ background: '#EF4444' }}>
                          {borrando ? '...' : 'Sí, eliminar'}
                        </button>
                        <button onClick={cancelarEliminar}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-[#f8d7b4] border border-[rgba(192,150,107,0.16)] bg-[#2a1f16]">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Panel derecho ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#1f1610]">
          {!clienteActivo ? (
            <div className="flex flex-col items-center justify-center h-full text-[#c7a17d]">
              <span className="text-6xl mb-3">👈</span>
              <p className="text-base font-medium text-[#d6c0a5]">Seleccioná un cliente de la lista</p>
              <p className="text-sm text-[#c7a17d] mt-1">Para ver su historial de compras y totales</p>
            </div>
          ) : (
            <PanelCliente
              key={clienteActivo.id}
              cliente={clienteActivo}
              ordenes={ordenes}
              cargandoOrdenes={cargandoOrdenes}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientesPage;