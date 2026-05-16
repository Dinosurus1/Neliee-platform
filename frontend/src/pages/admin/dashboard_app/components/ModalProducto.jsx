import { useState, useMemo } from 'react';

const CATEGORIAS = ['todas', 'offset', 'digital', 'gran formato'];

const CAT_COLORS = {
  offset:         { bg: '#FFF7ED', text: '#C2410C' },
  digital:        { bg: '#EFF6FF', text: '#1D4ED8' },
  'gran formato': { bg: '#F0FDF4', text: '#15803D' },
};

const resolverImagen = (img) => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  return `http://127.0.0.1:8000/imagenes/${img}`;
};

const ModalProducto = ({ productos = [], onSeleccionar, onCerrar }) => {
  const [categoriaActiva, setCategoria] = useState('todas');
  const [busqueda, setBusqueda]         = useState('');
  const [productoActivo, setProducto]   = useState(null);

  const filtrados = useMemo(() =>
    productos.filter(p => {
      const catOk = categoriaActiva === 'todas' || p.categoria === categoriaActiva;
      const busOk = !busqueda.trim() ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.categoria || '').toLowerCase().includes(busqueda.toLowerCase());
      return catOk && busOk;
    }),
  [productos, categoriaActiva, busqueda]);

  const elegirMedida = (medida) => {
    onSeleccionar({ producto: productoActivo, medida });
    onCerrar();
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-box w-full mx-4" style={{ maxWidth: 920, width: '95vw' }}>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl text-xl"
              style={{ width: 40, height: 40, background: '#D97706', color: '#fff' }}
            >
              🖨️
            </div>
            <h2 className="font-bold text-[#f8d7b4] text-lg">Catálogo de Productos</h2>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 rounded-xl transition"
            style={{ color: '#d6c0a5' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,150,107,0.16)'; e.currentTarget.style.color = '#f8d7b4'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d6c0a5'; }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search + Tabs */}
        <div
          className="px-6 py-3 flex flex-col sm:flex-row gap-3"
          style={{ borderBottom: '1px solid rgba(192,150,107,0.16)' }}
        >
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o categoría..."
            className="input flex-1"
            style={{ padding: '9px 14px' }}
            autoFocus
          />
          <div className="flex gap-1.5 flex-shrink-0">
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={categoriaActiva === cat
                  ? { background: '#D97706', color: '#fff' }
                  : { background: '#2a1f16', color: '#c7a17d', border: '1px solid rgba(192,150,107,0.18)' }
                }
              >
                {cat === 'todas' ? 'Todas' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: 400 }}>

          {/* ── Medidas panel ────────────────────── */}
          {productoActivo ? (
            <div>
              <button
                onClick={() => setProducto(null)}
                className="flex items-center gap-1.5 text-sm font-medium mb-5 transition"
                style={{ color: '#d6c0a5' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f8d7b4'}
                onMouseLeave={e => e.currentTarget.style.color = '#d6c0a5'}
              >
                ← Volver al catálogo
              </button>

              <div className="flex gap-5 mb-6">
                <div
                  className="flex items-center justify-center rounded-2xl overflow-hidden flex-shrink-0"
                  style={{ width: 100, height: 100, background: '#241b13' }}
                >
                  {resolverImagen(productoActivo.imagen_url) ? (
                    <img src={resolverImagen(productoActivo.imagen_url)} alt={productoActivo.nombre}
                         className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🖨️</span>
                  )}
                </div>
                <div>
                  {productoActivo.categoria && (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                      style={CAT_COLORS[productoActivo.categoria] || { bg: '#241b13', text: '#c7a17d' }}
                    >
                      {productoActivo.categoria}
                    </span>
                  )}
                  <h3 className="font-bold text-[#f8d7b4] text-xl mt-2">{productoActivo.nombre}</h3>
                  {productoActivo.descripcion && (
                    <p className="text-[#c7a17d] text-sm mt-1">{productoActivo.descripcion}</p>
                  )}
                </div>
              </div>

              <p className="text-xs font-bold uppercase tracking-widest text-[#c7a17d] mb-3">
                Seleccioná una medida
              </p>

              {productoActivo.medidas?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {productoActivo.medidas.map(m => (
                    <button
                      key={m.id}
                      onClick={() => elegirMedida(m)}
                      className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02] group"
                      style={{ border: '1.5px solid rgba(192,150,107,0.16)', background: '#241b13' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#D97706';
                        e.currentTarget.style.background = 'rgba(253,230,138,0.18)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(192,150,107,0.16)';
                        e.currentTarget.style.background = '#241b13';
                      }}
                    >
                      <p className="font-semibold text-[#f8d7b4] text-sm">{m.etiqueta}</p>
                      {(m.ancho_cm || m.alto_cm) && (
                        <p className="text-xs text-[#c7a17d] mt-1">
                          {m.ancho_cm} × {m.alto_cm} cm
                        </p>
                      )}
                      {m.precio_base && (
                        <p className="text-xs font-bold mt-1" style={{ color: '#D97706' }}>
                          ${m.precio_base.toLocaleString()}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#c7a17d', marginBottom: '0.75rem' }}>Sin medidas registradas.</p>
              )}

              <button
                onClick={() => { onSeleccionar({ producto: productoActivo, medida: null }); onCerrar(); }}
                className="mt-4 w-full py-3 rounded-2xl text-sm font-medium transition-all"
                style={{ border: '1.5px dashed rgba(239,175,107,0.4)', color: '#f8d7b4', background: '#241b13' }}
              >
                Continuar sin especificar medida
              </button>
            </div>

          ) : (
            /* ── Products grid ──────────────────── */
            <>
              {filtrados.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-[#c7a17d]">
                  <span className="text-5xl mb-3">🔍</span>
                  <p className="text-sm font-medium text-[#d6c0a5]">Sin resultados para "{busqueda}"</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#c7a17d] mb-4 font-medium">
                    {filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filtrados.map(p => {
                      const catStyle = CAT_COLORS[p.categoria] || { bg: '#241b13', text: '#c7a17d' };
                      return (
                        <button
                          key={p.id}
                          onClick={() => setProducto(p)}
                          className="rounded-2xl overflow-hidden text-left transition-all duration-200 group"
                          style={{ border: '1.5px solid rgba(192,150,107,0.16)', background: '#1a140f' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#D97706';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(217,119,6,0.18)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#E2E8F0';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {/* Image */}
                          <div
                            className="flex items-center justify-center overflow-hidden"
                            style={{ height: 96, background: '#241b13' }}
                          >
                            {resolverImagen(p.imagen_url) ? (
                              <img src={resolverImagen(p.imagen_url)} alt={p.nombre}
                                   className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-4xl">🖨️</span>
                            )}
                          </div>
                          {/* Info */}
                          <div className="p-3">
                            {p.categoria && (
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                                style={catStyle}
                              >
                                {p.categoria}
                              </span>
                            )}
                            <p className="font-semibold text-[#f8d7b4] text-sm mt-1.5 leading-tight">
                              {p.nombre}
                            </p>
                            {p.medidas?.length > 0 && (
                              <p className="text-xs text-[#c7a17d] mt-1">
                                {p.medidas.length} medida{p.medidas.length > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalProducto;