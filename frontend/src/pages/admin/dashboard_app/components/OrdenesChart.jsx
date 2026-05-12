import { useState, useMemo } from 'react';
 
const ESTADO_COLORES = {
  'Pendiente':  '#F59E0B',
  'En proceso': '#3B82F6',
  'Listo':      '#10B981',
  'Entregado':  '#94A3B8',
  'Cancelado':  '#EF4444',
};
 
const CHART_W    = 560;
const CHART_H    = 140;
const PAD_L      = 28;
const PAD_R      = 8;
const PAD_T      = 12;
const PAD_B      = 32;
const BAR_AREA_W = CHART_W - PAD_L - PAD_R;
const BAR_AREA_H = CHART_H - PAD_T - PAD_B;
 
// ✅ FIX: el backend devuelve fechas UTC sin 'Z'. Forzamos UTC para que
// la conversión a hora local sea correcta y el gráfico muestre el día real.
const parseUTC = (str) => {
  if (!str) return new Date(NaN);
  if (str.endsWith('Z') || str.includes('+') || /\d{2}-\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }
  return new Date(str + 'Z');
};
 
const generarDias = (n) => {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (n - 1 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
};
 
// ✅ Compara usando la fecha LOCAL del usuario (no UTC)
const mismaFecha = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();
 
const OrdenesChart = ({ ordenes = [] }) => {
  const [tooltip, setTooltip] = useState(null);
  const DIAS = 14;
 
  const datos = useMemo(() => {
    const dias = generarDias(DIAS);
    return dias.map(dia => ({
      dia,
      label: dia.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
      // ✅ parseUTC convierte la fecha a hora local antes de comparar
      count: ordenes.filter(o => mismaFecha(parseUTC(o.fecha_creacion), dia)).length,
    }));
  }, [ordenes]);
 
  const conteoEstados = useMemo(() => {
    const map = {};
    ordenes.forEach(o => { map[o.estado] = (map[o.estado] || 0) + 1; });
    return map;
  }, [ordenes]);
 
  const maxCount  = Math.max(...datos.map(d => d.count), 1);
  const barW      = BAR_AREA_W / DIAS;
  const barPad    = barW * 0.28;
  const yLines    = [0, Math.ceil(maxCount / 2), maxCount];
 
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-slate-800 text-base">
            Actividad — últimos 14 días
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{ordenes.length} órdenes en total</p>
        </div>
 
        <div className="flex flex-wrap gap-2">
          {Object.entries(ESTADO_COLORES).map(([estado, color]) => {
            const n = conteoEstados[estado] || 0;
            if (n === 0) return null;
            return (
              <span
                key={estado}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
              >
                <span className="inline-block rounded-full flex-shrink-0"
                  style={{ width: 6, height: 6, background: color }} />
                {estado} · {n}
              </span>
            );
          })}
        </div>
      </div>
 
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width="100%"
          style={{ minWidth: 320 }}
          onMouseLeave={() => setTooltip(null)}
        >
          {yLines.map(v => {
            const y = PAD_T + BAR_AREA_H - (v / maxCount) * BAR_AREA_H;
            return (
              <g key={v}>
                <line x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y}
                  stroke="#E2E8F0" strokeWidth="1" />
                <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#CBD5E1">
                  {v}
                </text>
              </g>
            );
          })}
 
          {datos.map((d, i) => {
            const barH  = (d.count / maxCount) * BAR_AREA_H;
            const x     = PAD_L + i * barW + barPad / 2;
            const y     = PAD_T + BAR_AREA_H - barH;
            const w     = barW - barPad;
            const esHoy = mismaFecha(d.dia, new Date());
 
            return (
              <g key={i}>
                <rect x={x} y={PAD_T} width={w} height={BAR_AREA_H}
                  fill="transparent"
                  onMouseEnter={() => setTooltip({ x: x + w / 2, y, label: d.label, count: d.count })} />
 
                {d.count > 0 && (
                  <rect x={x} y={y} width={w} height={barH}
                    fill={esHoy ? '#0F172A' : '#D97706'}
                    rx="3" ry="3"
                    opacity={tooltip?.label === d.label ? 1 : 0.8} />
                )}
 
                <text x={x + w / 2} y={CHART_H - PAD_B + 14}
                  textAnchor="middle" fontSize="9"
                  fill={esHoy ? '#0F172A' : '#94A3B8'}
                  fontWeight={esHoy ? 'bold' : 'normal'}>
                  {d.label}
                </text>
              </g>
            );
          })}
 
          {tooltip && tooltip.count > 0 && (
            <g>
              <rect
                x={Math.min(tooltip.x - 26, CHART_W - 56)}
                y={tooltip.y - 24}
                width={52} height={18} rx="6" fill="#0F172A" />
              <text
                x={Math.min(tooltip.x, CHART_W - 30)}
                y={tooltip.y - 11}
                textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                {tooltip.count} {tooltip.count === 1 ? 'orden' : 'órdenes'}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
 
export default OrdenesChart;