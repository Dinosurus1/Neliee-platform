import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../../api/dashboardService';

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

const COP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v ?? 0);

const CATEGORIAS_GASTO = [
  'Stock / Insumos',
  'Mantenimiento',
  'Servicios',
  'Personal',
  'Equipos',
  'Otros',
];

const CAT_GASTO_CONFIG = {
  'Stock / Insumos': { color: '#D97706', bg: '#FEF3C7', emoji: '📦' },
  'Mantenimiento':   { color: '#7C3AED', bg: '#EDE9FE', emoji: '🔧' },
  'Servicios':       { color: '#0891B2', bg: '#E0F2FE', emoji: '⚡' },
  'Personal':        { color: '#059669', bg: '#D1FAE5', emoji: '👤' },
  'Equipos':         { color: '#DC2626', bg: '#FEE2E2', emoji: '🖨️' },
  'Otros':           { color: '#64748B', bg: '#241b13', emoji: '📎' },
};

// ─────────────────────────────────────────────────────────────────────────────
// GRÁFICA MENSUAL (SVG manual, misma técnica que OrdenesChart)
// ─────────────────────────────────────────────────────────────────────────────

const GraficaMensual = ({ datos = [] }) => {
  const [tooltip, setTooltip] = useState(null);
  const W = 620, H = 160, PL = 56, PR = 12, PT = 14, PB = 36;
  const AW = W - PL - PR, AH = H - PT - PB;

  const maxVal = Math.max(...datos.flatMap(d => [d.ganancias, d.gastos]), 1);
  const barW   = AW / Math.max(datos.length, 1);
  const barPad = barW * 0.22;
  const bw     = (barW - barPad) / 2;

  const mesLabel = (mes) => {
    const [y, m] = mes.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('es-CO', { month: 'short' });
  };

  const yLines = [0, Math.ceil(maxVal / 2), maxVal];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 340 }} onMouseLeave={() => setTooltip(null)}>
        {/* Líneas guía */}
        {yLines.map(v => {
          const y = PT + AH - (v / maxVal) * AH;
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text x={PL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94A3B8">
                {v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              </text>
            </g>
          );
        })}

        {/* Barras */}
        {datos.map((d, i) => {
          const x = PL + i * barW + barPad / 2;
          const hG = (d.ganancias / maxVal) * AH;
          const hC = (d.gastos / maxVal) * AH;
          const yG = PT + AH - hG;
          const yC = PT + AH - hC;
          const cx = x + bw / 2;

          return (
            <g key={d.mes}>
              {/* Zona hover */}
              <rect
                x={x} y={PT} width={bw * 2 + 2} height={AH} fill="transparent"
                onMouseEnter={() => setTooltip({ x: cx + bw + 1, label: mesLabel(d.mes), ...d })}
              />
              {/* Barra ganancias */}
              {d.ganancias > 0 && (
                <rect x={x} y={yG} width={bw} height={hG} rx="3" fill="#10B981" opacity="0.85" />
              )}
              {/* Barra gastos */}
              {d.gastos > 0 && (
                <rect x={x + bw + 2} y={yC} width={bw} height={hC} rx="3" fill="#EF4444" opacity="0.75" />
              )}
              {/* Etiqueta mes */}
              <text x={x + bw + 1} y={H - PB + 14} textAnchor="middle" fontSize="9" fill="#94A3B8">
                {mesLabel(d.mes)}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x - 50, W - 108)}
              y={PT}
              width={106} height={48}
              rx="8" fill="#0F172A"
            />
            <text x={Math.min(tooltip.x, W - 55)} y={PT + 14} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)">
              {tooltip.label}
            </text>
            <text x={Math.min(tooltip.x, W - 55)} y={PT + 26} textAnchor="middle" fontSize="9" fill="#34D399" fontWeight="bold">
              ▲ {tooltip.ganancias >= 1000 ? `${(tooltip.ganancias/1000).toFixed(0)}k` : tooltip.ganancias}
            </text>
            <text x={Math.min(tooltip.x, W - 55)} y={PT + 40} textAnchor="middle" fontSize="9" fill="#F87171" fontWeight="bold">
              ▼ {tooltip.gastos >= 1000 ? `${(tooltip.gastos/1000).toFixed(0)}k` : tooltip.gastos}
            </text>
          </g>
        )}

        {/* Leyenda */}
        <g>
          <rect x={PL} y={H - 10} width={8} height={8} rx="2" fill="#10B981" />
          <text x={PL + 10} y={H - 3} fontSize="8" fill="#64748B">Ganancias</text>
          <rect x={PL + 68} y={H - 10} width={8} height={8} rx="2" fill="#EF4444" />
          <text x={PL + 78} y={H - 3} fontSize="8" fill="#64748B">Gastos</text>
        </g>
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TABLA DE ÓRDENES FINANCIERAS
// ─────────────────────────────────────────────────────────────────────────────

const TablaOrdenes = ({ items = [], tipo }) => {
  const colorAccent = tipo === 'ganancia' ? '#10B981' : '#F59E0B';
  const bgAccent    = tipo === 'ganancia' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)';

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-10" style={{ color: '#c7a17d' }}>
        <span className="text-4xl mb-2">{tipo === 'ganancia' ? '📭' : '🕐'}</span>
        <p className="text-sm" style={{ color: '#d6c0a5' }}>
          {tipo === 'ganancia' ? 'Aún no hay órdenes entregadas con precio.' : 'Sin órdenes pendientes con precio.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#241b13', borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
            {['#', 'Cliente', 'Producto / Medida', 'Cant.', 'Precio unit.', 'Subtotal', 'Fecha'].map(h => (
              <th key={h} className="text-left py-2.5 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#c7a17d' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr
              key={item.orden_id}
              className="transition-colors"
              style={{ borderBottom: '1px solid rgba(192,150,107,0.12)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#241b13'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td className="py-3 px-3">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#241b13', color: '#c7a17d' }}>
                  #{item.orden_id}
                </span>
              </td>
              <td className="py-3 px-3 font-medium" style={{ color: '#f8d7b4' }}>{item.cliente_nombre}</td>
              <td className="py-3 px-3">
                <p className="font-medium text-xs" style={{ color: '#f8d7b4' }}>{item.producto_nombre}</p>
                {item.medida_etiqueta && (
                  <p className="text-xs" style={{ color: '#c7a17d' }}>{item.medida_etiqueta}</p>
                )}
              </td>
              <td className="py-3 px-3 text-xs" style={{ color: '#c7a17d' }}>{item.cantidad ?? '—'}</td>
              <td className="py-3 px-3 text-xs" style={{ color: '#c7a17d' }}>
                {item.precio_unitario != null ? COP(item.precio_unitario) : <span className="italic" style={{ color: '#8f7a69' }}>Sin precio</span>}
              </td>
              <td className="py-3 px-3">
                {item.subtotal != null ? (
                  <span className="font-bold text-sm" style={{ color: colorAccent }}>
                    {COP(item.subtotal)}
                  </span>
                ) : (
                  <span className="text-xs italic" style={{ color: '#8f7a69' }}>—</span>
                )}
              </td>
              <td className="py-3 px-3 text-xs" style={{ color: '#c7a17d' }}>
                {new Date(item.fecha_creacion).toLocaleDateString('es-CO', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL NUEVO GASTO
// ─────────────────────────────────────────────────────────────────────────────

const ModalGasto = ({ gasto, onCerrar, onGuardado }) => {
  const esEdicion = !!gasto;
  const hoy = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    descripcion: gasto?.descripcion ?? '',
    monto: gasto?.monto ?? '',
    categoria: gasto?.categoria ?? CATEGORIAS_GASTO[0],
    fecha: gasto?.fecha ? new Date(gasto.fecha).toISOString().slice(0, 10) : hoy,
    notas: gasto?.notas ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  const guardar = async () => {
    if (!form.descripcion.trim()) { setError('La descripción es obligatoria.'); return; }
    if (!form.monto || parseFloat(form.monto) <= 0) { setError('El monto debe ser mayor a 0.'); return; }
    setGuardando(true);
    try {
      const payload = {
        descripcion: form.descripcion.trim(),
        monto: parseFloat(form.monto),
        categoria: form.categoria,
        fecha: new Date(form.fecha).toISOString(),
        notas: form.notas.trim() || null,
      };
      let data;
      if (esEdicion) {
        ({ data } = await api.patch(`/gastos/${gasto.id}`, payload));
      } else {
        ({ data } = await api.post('/gastos/', payload));
      }
      onGuardado(data, esEdicion);
      onCerrar();
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const cfg = CAT_GASTO_CONFIG[form.categoria] || CAT_GASTO_CONFIG['Otros'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="rounded-2xl shadow-2xl p-6 w-full mx-4 overflow-y-auto" style={{ maxWidth: 460, maxHeight: '92vh', background: '#1a140f', border: '1px solid rgba(192,150,107,0.16)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: cfg.bg }}>
            {cfg.emoji}
          </div>
          <h3 className="font-bold text-[#f8d7b4] text-lg">
            {esEdicion ? 'Editar Gasto' : 'Registrar Gasto'}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c7a17d' }}>
              Descripción <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Ej: Compra de papel couché, Mantenimiento ploter…"
              className="input"
              style={{ background: '#241b13', borderColor: '#3b2a1d', color: '#f8d7b4' }}
            />
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c7a17d' }}>
                Monto ($) <span className="text-red-400">*</span>
              </label>
              <input
                type="number" min="0" step="100"
                value={form.monto}
                onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                placeholder="Ej: 150000"
                className="input"
                style={{ background: '#241b13', borderColor: '#3b2a1d', color: '#f8d7b4' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c7a17d' }}>
                Fecha
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                className="input"
                style={{ background: '#241b13', borderColor: '#3b2a1d', color: '#f8d7b4' }}
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#c7a17d' }}>
              Categoría
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIAS_GASTO.map(cat => {
                const c = CAT_GASTO_CONFIG[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, categoria: cat }))}
                    className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all border"
                    style={form.categoria === cat
                      ? { background: c.bg, color: c.color, borderColor: c.color, boxShadow: `0 0 0 2px ${c.color}25` }
                      : { background: '#241b13', color: '#c7a17d', borderColor: '#3b2a1d' }
                    }
                  >
                    <span className="text-base">{c.emoji}</span>
                    <span className="text-center leading-tight">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c7a17d' }}>
              Notas (opcional)
            </label>
            <input
              value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              placeholder="Detalles adicionales…"
              className="input"
              style={{ background: '#241b13', borderColor: '#3b2a1d', color: '#f8d7b4' }}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar} className="btn-outline flex-1">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="btn-primary flex-1">
              {guardando ? '⏳ Guardando…' : esEdicion ? '✔ Actualizar' : '✔ Registrar gasto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: RENDIMIENTOS
// ─────────────────────────────────────────────────────────────────────────────

const TabRendimientos = ({ resumen, cargando, mensual }) => {
  const [vistaDetalle, setVistaDetalle] = useState('ganancias'); // 'ganancias' | 'deuda'

  if (cargando) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl" style={{ background: '#241b13' }} />)}
        </div>
        <div className="h-44 rounded-2xl" style={{ background: '#241b13' }} />
        <div className="h-64 rounded-2xl" style={{ background: '#241b13' }} />
      </div>
    );
  }

  if (!resumen) return null;

  const balancePositivo = resumen.balance_neto >= 0;

  return (
    <div className="space-y-5">

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Balance neto */}
        <div
          className="lg:col-span-1 rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: balancePositivo ? '#0F172A' : '#1C0A0A',
            boxShadow: balancePositivo
              ? '0 4px 24px rgba(16,185,129,0.15)'
              : '0 4px 24px rgba(239,68,68,0.15)',
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Balance Neto
          </p>
          <div className="mt-2">
            <p className="text-2xl font-bold leading-none" style={{ color: balancePositivo ? '#34D399' : '#F87171' }}>
              {COP(resumen.balance_neto)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {balancePositivo ? '✅ Ganancia neta' : '⚠️ En déficit'}
            </p>
          </div>
        </div>

        {/* Ganancias */}
        <div className="rounded-2xl p-5" style={{ background: '#1a140f', border: '1.5px solid rgba(52,211,153,0.15)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34D399' }}>Cobrado</p>
          <p className="text-2xl font-bold mt-1 leading-none" style={{ color: '#34D399' }}>{COP(resumen.ganancias_entregado)}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {resumen.detalle_ganancias.length} órden{resumen.detalle_ganancias.length !== 1 ? 'es' : ''} entregada{resumen.detalle_ganancias.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Deuda */}
        <div className="rounded-2xl p-5" style={{ background: '#1a140f', border: '1.5px solid rgba(245,158,11,0.15)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F59E0B' }}>Por cobrar</p>
          <p className="text-2xl font-bold mt-1 leading-none" style={{ color: '#F59E0B' }}>{COP(resumen.deuda_pendiente)}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {resumen.detalle_deuda.length} órden{resumen.detalle_deuda.length !== 1 ? 'es' : ''} pendiente{resumen.detalle_deuda.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Gastos */}
        <div className="rounded-2xl p-5" style={{ background: '#1a140f', border: '1.5px solid rgba(248,113,113,0.18)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F87171' }}>Gastos totales</p>
          <p className="text-2xl font-bold mt-1 leading-none" style={{ color: '#F87171' }}>{COP(resumen.total_gastos)}</p>
          {resumen.ordenes_sin_precio > 0 && (
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              ⚠️ {resumen.ordenes_sin_precio} órdenes sin precio
            </p>
          )}
        </div>
      </div>

      {/* ── Gráfica mensual ────────────────────────────────────────── */}
      {mensual.length > 0 && (
        <div className="rounded-2xl border p-5" style={{ background: '#1a140f', borderColor: 'rgba(192,150,107,0.16)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#f8d7b4] text-sm">Evolución mensual</h3>
              <p className="text-xs" style={{ color: '#c7a17d', marginTop: '0.125rem' }}>Últimos 6 meses · Ganancias vs Gastos</p>
            </div>
          </div>
          <GraficaMensual datos={mensual} />
        </div>
      )}

      {/* ── Detalle de órdenes ─────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#1a140f', borderColor: 'rgba(192,150,107,0.16)' }}>
        {/* Tabs internos */}
        <div className="flex" style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
          {[
            { id: 'ganancias', label: '✅ Cobrado', count: resumen.detalle_ganancias.length },
            { id: 'deuda',     label: '⏳ Por cobrar', count: resumen.detalle_deuda.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setVistaDetalle(t.id)}
              className="flex-1 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={vistaDetalle === t.id
                ? { background: '#241b13', borderBottom: `2px solid ${t.id === 'ganancias' ? '#10B981' : '#F59E0B'}`, color: '#f8d7b4' }
                : { color: '#c7a17d' }
              }
            >
              {t.label}
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={vistaDetalle === t.id
                  ? { background: '#241b13', color: t.id === 'ganancias' ? '#34D399' : '#F59E0B' }
                  : { background: '#241b13', color: '#c7a17d' }
                }
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <TablaOrdenes
          items={vistaDetalle === 'ganancias' ? resumen.detalle_ganancias : resumen.detalle_deuda}
          tipo={vistaDetalle === 'ganancias' ? 'ganancia' : 'deuda'}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: GASTOS
// ─────────────────────────────────────────────────────────────────────────────

const TabGastos = ({ gastos, setGastos, cargandoGastos }) => {
  const [modal, setModal]               = useState(null); // null | 'nuevo' | gasto
  const [eliminandoId, setEliminandoId] = useState(null);
  const [filtroCat, setFiltroCat]       = useState('todas');
  const [busqueda, setBusqueda]         = useState('');

  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      const catOk = filtroCat === 'todas' || g.categoria === filtroCat;
      const busOk = !busqueda.trim() ||
        g.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        g.categoria.toLowerCase().includes(busqueda.toLowerCase());
      return catOk && busOk;
    });
  }, [gastos, filtroCat, busqueda]);

  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + g.monto, 0);

  const handleGuardado = (data, esEdicion) => {
    if (esEdicion) {
      setGastos(prev => prev.map(g => g.id === data.id ? data : g));
    } else {
      setGastos(prev => [data, ...prev]);
    }
  };

  const eliminar = async (id) => {
    try {
      await api.delete(`/gastos/${id}`);
      setGastos(prev => prev.filter(g => g.id !== id));
      setEliminandoId(null);
    } catch (e) {
      alert(e.response?.data?.detail || 'Error al eliminar.');
    }
  };

  // Agrupar por categoría para el resumen
  const porCategoria = useMemo(() => {
    const map = {};
    gastos.forEach(g => {
      map[g.categoria] = (map[g.categoria] || 0) + g.monto;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [gastos]);

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);

  return (
    <div className="space-y-5">

      {/* ── Resumen por categoría ──────────────────────────────────── */}
      {porCategoria.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {porCategoria.map(([cat, total]) => {
            const cfg = CAT_GASTO_CONFIG[cat] || CAT_GASTO_CONFIG['Otros'];
            const pct = totalGastos > 0 ? Math.round((total / totalGastos) * 100) : 0;
            return (
              <div
                key={cat}
                className="rounded-2xl p-4 cursor-pointer transition-all"
                style={{
                  background: filtroCat === cat ? cfg.bg : '#1a140f',
                  border: `1.5px solid ${filtroCat === cat ? cfg.color : 'rgba(192,150,107,0.16)'}`,
                  boxShadow: filtroCat === cat ? `0 0 0 2px ${cfg.color}20` : 'none',
                }}
                onClick={() => setFiltroCat(filtroCat === cat ? 'todas' : cat)}
              >
                <span className="text-xl">{cfg.emoji}</span>
                <p className="text-xs font-semibold mt-1 leading-tight" style={{ color: '#c7a17d' }}>{cat}</p>
                <p className="font-bold text-sm mt-0.5" style={{ color: cfg.color }}>
                  {COP(total)}
                </p>
                <p className="text-xs" style={{ color: '#c7a17d' }}>{pct}%</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Barra de acciones ─────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#1a140f', borderColor: 'rgba(192,150,107,0.16)' }}>
        <div
          className="flex items-center justify-between px-5 py-4 gap-3 flex-wrap"
          style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar gasto…"
              className="input text-sm"
              style={{ maxWidth: 260, padding: '7px 12px', background: '#241b13', borderColor: '#3b2a1d', color: '#f8d7b4' }}
            />
            {gastosFiltrados.length > 0 && (
              <span className="text-xs font-medium flex-shrink-0" style={{ color: '#c7a17d' }}>
                {gastosFiltrados.length} registro{gastosFiltrados.length !== 1 ? 's' : ''} · {COP(totalFiltrado)}
              </span>
            )}
          </div>
          <button
            onClick={() => setModal('nuevo')}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            <span>+</span> Nuevo gasto
          </button>
        </div>

        {/* Tabla */}
        {cargandoGastos ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl" style={{ background: '#241b13' }} />)}
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center py-14" style={{ color: '#c7a17d' }}>
            <span className="text-5xl mb-3">💸</span>
            <p className="text-sm font-medium" style={{ color: '#d6c0a5' }}>
              {gastos.length === 0 ? 'Aún no hay gastos registrados.' : 'Sin resultados para el filtro.'}
            </p>
            {gastos.length === 0 && (
              <button onClick={() => setModal('nuevo')} className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700 transition">
                + Registrar el primer gasto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#241b13', borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
                  {['#', 'Descripción', 'Categoría', 'Monto', 'Fecha', 'Notas', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: '#c7a17d' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gastosFiltrados.map(g => {
                  const cfg = CAT_GASTO_CONFIG[g.categoria] || CAT_GASTO_CONFIG['Otros'];
                  return (
                    <tr
                      key={g.id}
                      className="group transition-colors"
                      style={{ borderBottom: '1px solid rgba(192,150,107,0.12)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#241b13'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#241b13', color: '#c7a17d' }}>
                          #{g.id}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium" style={{ color: '#f8d7b4' }}>{g.descripcion}</td>
                      <td className="py-3 px-4">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.emoji} {g.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold" style={{ color: '#DC2626' }}>
                        {COP(g.monto)}
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: '#c7a17d' }}>
                        {new Date(g.fecha).toLocaleDateString('es-CO', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-xs max-w-[140px] truncate" style={{ color: '#c7a17d' }}>
                        {g.notas || <span className="italic" style={{ color: '#8f7a69' }}>—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {eliminandoId === g.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => eliminar(g.id)}
                              className="text-xs font-bold text-red-600 hover:text-red-700 transition"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setEliminandoId(null)}
                              className="text-xs"
                            style={{ color: '#c7a17d' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f8d7b4'}
                            onMouseLeave={e => e.currentTarget.style.color = '#c7a17d'}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setModal(g)}
                              className="text-xs" style={{ color: '#c7a17d' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f8d7b4'}
                            onMouseLeave={e => e.currentTarget.style.color = '#c7a17d'}
                          
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setEliminandoId(g.id)}
                              className="text-xs" style={{ color: '#c7a17d' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f8d7b4'}
                            onMouseLeave={e => e.currentTarget.style.color = '#c7a17d'}
                          
                            >
                              🗑
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <ModalGasto
          gasto={modal === 'nuevo' ? null : modal}
          onCerrar={() => setModal(null)}
          onGuardado={handleGuardado}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const RendimientosPage = () => {
  const [tab, setTab]               = useState('rendimientos'); // 'rendimientos' | 'gastos'
  const [resumen, setResumen]       = useState(null);
  const [mensual, setMensual]       = useState([]);
  const [gastos, setGastos]         = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [cargandoGastos, setCargandoGastos] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/estadisticas/financiero'),
      api.get('/estadisticas/mensual?meses=6'),
    ])
      .then(([rf, rm]) => {
        setResumen(rf.data);
        setMensual(rm.data);
      })
      .catch(console.error)
      .finally(() => setCargando(false));

    api.get('/gastos/')
      .then(r => setGastos(r.data))
      .catch(console.error)
      .finally(() => setCargandoGastos(false));
  }, []);

  // Re-fetch resumen cuando cambian los gastos (para mantener balance actualizado)
  const refetchResumen = () => {
    api.get('/estadisticas/financiero').then(r => setResumen(r.data)).catch(console.error);
    api.get('/estadisticas/mensual?meses=6').then(r => setMensual(r.data)).catch(console.error);
  };

  // Cuando se agrega/edita/elimina un gasto, actualizar el resumen
  const handleSetGastos = (updater) => {
    setGastos(updater);
    // Pequeño delay para que el backend procese
    setTimeout(refetchResumen, 300);
  };

  return (
    <div className="space-y-4">

      {/* ── Header + tabs principales ─────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden" style={{ background: '#1a140f', borderColor: 'rgba(192,150,107,0.16)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl text-xl"
              style={{ width: 42, height: 42, background: '#0F172A' }}
            >
              📊
            </div>
            <div>
              <h2 className="font-bold text-[#f8d7b4] text-lg leading-tight">Rendimientos Financieros</h2>
              <p className="text-xs" style={{ color: '#c7a17d' }}>
                Ganancias · Deudas · Gastos operativos
              </p>
            </div>
          </div>
          {!cargando && resumen && (
            <div
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                background: resumen.balance_neto >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.16)',
                color: resumen.balance_neto >= 0 ? '#34D399' : '#F87171',
              }}
            >
              {resumen.balance_neto >= 0 ? '▲' : '▼'} {COP(Math.abs(resumen.balance_neto))}
            </div>
          )}
        </div>

        {/* Tab selector */}
        <div className="flex px-6 pt-1">
          {[
            { id: 'rendimientos', label: '📈 Rendimientos', desc: 'Ganancias y deudas' },
            { id: 'gastos',       label: '💸 Gastos',       desc: 'Gastos operativos' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="mr-1 px-5 py-3 text-sm font-semibold transition-all relative"
              style={tab === t.id
                ? { color: '#f8d7b4', borderBottom: '2px solid #D97706', marginBottom: -1 }
                : { color: '#c7a17d', borderBottom: '2px solid transparent', marginBottom: -1 }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido del tab activo ──────────────────────────────── */}
      {tab === 'rendimientos' && (
        <TabRendimientos resumen={resumen} cargando={cargando} mensual={mensual} />
      )}
      {tab === 'gastos' && (
        <TabGastos gastos={gastos} setGastos={handleSetGastos} cargandoGastos={cargandoGastos} />
      )}
    </div>
  );
};

export default RendimientosPage;