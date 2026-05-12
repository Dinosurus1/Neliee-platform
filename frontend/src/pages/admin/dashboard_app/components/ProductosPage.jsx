import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../../api/dashboardService';

const CATEGORIAS = ['offset', 'digital', 'gran formato'];

const CAT_CONFIG = {
  offset:         { color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA', emoji: '🖨️' },
  digital:        { color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', emoji: '💻' },
  'gran formato': { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', emoji: '📐' },
};

// ── Componente de precio editable inline ──────────────────────────────────
const PrecioEditable = ({ medida, productoId, onActualizado }) => {
  const [editando, setEditando]   = useState(false);
  const [valor, setValor]         = useState(medida.precio_base ?? '');
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editando && inputRef.current) inputRef.current.focus();
  }, [editando]);

  const guardar = async () => {
    const precio = valor === '' ? null : parseFloat(valor);
    if (precio !== null && isNaN(precio)) { setEditando(false); return; }
    setGuardando(true);
    try {
      await api.patch(`/productos/${productoId}/medidas/${medida.id}`, {
        precio_base: precio,
      });
      onActualizado(medida.id, precio);
      setEditando(false);
    } catch (e) {
      console.error(e);
    } finally {
      setGuardando(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') guardar();
    if (e.key === 'Escape') { setValor(medida.precio_base ?? ''); setEditando(false); }
  };

  if (guardando) {
    return <span className="text-xs text-amber-500 font-medium">Guardando…</span>;
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-400">$</span>
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="100"
          value={valor}
          onChange={e => setValor(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={guardar}
          className="w-24 text-xs border border-amber-400 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-300"
          style={{ background: '#FFFBEB' }}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditando(true)}
      title="Clic para editar precio"
      className="group flex items-center gap-1 rounded-lg px-2 py-1 transition-all hover:bg-amber-50"
    >
      {medida.precio_base != null ? (
        <span className="text-xs font-bold text-amber-700">
          ${medida.precio_base.toLocaleString('es-CO')}
        </span>
      ) : (
        <span className="text-xs text-slate-300 group-hover:text-amber-400 italic">
          Sin precio
        </span>
      )}
      <span className="text-slate-300 group-hover:text-amber-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        ✏️
      </span>
    </button>
  );
};

// ── Modal para agregar medida ─────────────────────────────────────────────
const ModalNuevaMedida = ({ productoId, onCerrar, onAgregada }) => {
  const [form, setForm] = useState({ etiqueta: '', ancho_cm: '', alto_cm: '', precio_base: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    if (!form.etiqueta.trim()) { setError('La etiqueta es obligatoria.'); return; }
    setGuardando(true);
    try {
      const payload = {
        etiqueta: form.etiqueta.trim(),
        ancho_cm: form.ancho_cm ? parseFloat(form.ancho_cm) : null,
        alto_cm:  form.alto_cm  ? parseFloat(form.alto_cm)  : null,
        precio_base: form.precio_base ? parseFloat(form.precio_base) : null,
      };
      const { data } = await api.post(`/productos/${productoId}/medidas`, payload);
      onAgregada(data);
      onCerrar();
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full mx-4" style={{ maxWidth: 420 }}>
        <h3 className="font-bold text-slate-800 mb-4">Nueva medida / formato</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Etiqueta <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={form.etiqueta}
              onChange={e => setForm(p => ({ ...p, etiqueta: e.target.value }))}
              placeholder="Ej: 10×15 cm, Carta, A4..."
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Ancho (cm)
              </label>
              <input
                type="number" min="0" step="0.1"
                value={form.ancho_cm}
                onChange={e => setForm(p => ({ ...p, ancho_cm: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Alto (cm)
              </label>
              <input
                type="number" min="0" step="0.1"
                value={form.alto_cm}
                onChange={e => setForm(p => ({ ...p, alto_cm: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Precio base ($)
            </label>
            <input
              type="number" min="0" step="100"
              value={form.precio_base}
              onChange={e => setForm(p => ({ ...p, precio_base: e.target.value }))}
              placeholder="Ej: 25000"
              className="input"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar} className="btn-outline flex-1">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="btn-primary flex-1">
              {guardando ? '⏳ Guardando…' : '✔ Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal para crear/editar producto ─────────────────────────────────────
const ModalProductoForm = ({ producto, onCerrar, onGuardado }) => {
  const esEdicion = !!producto;
  const [form, setForm] = useState({
    nombre:      producto?.nombre      ?? '',
    descripcion: producto?.descripcion ?? '',
    categoria:   producto?.categoria   ?? CATEGORIAS[0],
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true);
    try {
      let data;
      if (esEdicion) {
        ({ data } = await api.patch(`/productos/${producto.id}`, form));
      } else {
        ({ data } = await api.post('/productos/', form));
      }
      onGuardado(data, esEdicion);
      onCerrar();
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full mx-4" style={{ maxWidth: 440 }}>
        <h3 className="font-bold text-slate-800 mb-4">
          {esEdicion ? `Editar: ${producto.nombre}` : 'Nuevo Producto'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Tarjetas de Presentación"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Descripción
            </label>
            <input
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Ej: Papel couché 300g, full color"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Categoría
            </label>
            <div className="flex gap-2">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, categoria: cat }))}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all border"
                  style={form.categoria === cat
                    ? { background: CAT_CONFIG[cat].bg, color: CAT_CONFIG[cat].color, borderColor: CAT_CONFIG[cat].border }
                    : { background: '#F8FAFC', color: '#94A3B8', borderColor: '#E2E8F0' }
                  }
                >
                  {CAT_CONFIG[cat].emoji} {cat}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar} className="btn-outline flex-1">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="btn-primary flex-1">
              {guardando ? '⏳ Guardando…' : esEdicion ? '✔ Actualizar' : '✔ Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Panel de detalle de producto ──────────────────────────────────────────
const PanelProducto = ({ producto, onPrecioActualizado, onMedidaAgregada, onMedidaEliminada, onEditar }) => {
  const [modalMedida, setModalMedida] = useState(false);
  const [eliminandoMedida, setEliminandoMedida] = useState(null);

  const cfg = CAT_CONFIG[producto.categoria] || CAT_CONFIG.offset;

  const eliminarMedida = async (medidaId) => {
    try {
      await api.delete(`/productos/${producto.id}/medidas/${medidaId}`);
      onMedidaEliminada(producto.id, medidaId);
      setEliminandoMedida(null);
    } catch (e) {
      alert(e.response?.data?.detail || 'No se pudo eliminar.');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header del producto */}
      <div
        className="rounded-2xl p-5 mb-4 flex items-start justify-between gap-3"
        style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center rounded-2xl text-2xl flex-shrink-0"
            style={{ width: 56, height: 56, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {cfg.emoji}
          </div>
          <div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full capitalize"
              style={{ background: 'white', color: cfg.color }}
            >
              {producto.categoria}
            </span>
            <h2 className="font-bold text-slate-800 text-xl mt-1">{producto.nombre}</h2>
            {producto.descripcion && (
              <p className="text-sm text-slate-500 mt-0.5">{producto.descripcion}</p>
            )}
          </div>
        </div>
        <button
          onClick={onEditar}
          className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
          style={{ background: 'white', color: cfg.color, border: `1px solid ${cfg.border}` }}
        >
          ✏️ Editar
        </button>
      </div>

      {/* Tabla de medidas con precios */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div>
            <p className="font-bold text-slate-700 text-sm">Medidas y Precios</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Clic en el precio para editar · Enter para guardar · Esc para cancelar
            </p>
          </div>
          <button
            onClick={() => setModalMedida(true)}
            className="text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            style={{ background: '#FEF3C7', color: '#92400E' }}
          >
            + Agregar medida
          </button>
        </div>

        {producto.medidas?.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-slate-300">
            <span className="text-4xl mb-2">📏</span>
            <p className="text-sm text-slate-400">Sin medidas registradas</p>
            <button
              onClick={() => setModalMedida(true)}
              className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700 transition"
            >
              + Agregar la primera medida
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Medida / Formato
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Dimensiones
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Precio Base
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {producto.medidas.map(m => (
                  <tr
                    key={m.id}
                    className="group transition-colors"
                    style={{ borderBottom: '1px solid #F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FFFBEB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="py-3 px-4 font-medium text-slate-700">{m.etiqueta}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {m.ancho_cm && m.alto_cm
                        ? `${m.ancho_cm} × ${m.alto_cm} cm`
                        : <span className="italic text-slate-300">—</span>
                      }
                    </td>
                    <td className="py-3 px-4">
                      <PrecioEditable
                        medida={m}
                        productoId={producto.id}
                        onActualizado={(mid, precio) => onPrecioActualizado(producto.id, mid, precio)}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {eliminandoMedida === m.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => eliminarMedida(m.id)}
                            className="text-xs font-bold text-red-600 hover:text-red-700 transition"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setEliminandoMedida(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEliminandoMedida(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition text-xs"
                          title="Eliminar medida"
                        >
                          🗑
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalMedida && (
        <ModalNuevaMedida
          productoId={producto.id}
          onCerrar={() => setModalMedida(false)}
          onAgregada={(nuevaMedida) => {
            onMedidaAgregada(producto.id, nuevaMedida);
            setModalMedida(false);
          }}
        />
      )}
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────
const ProductosPage = () => {
  const [productos, setProductos]         = useState([]);
  const [cargando, setCargando]           = useState(true);
  const [busqueda, setBusqueda]           = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [productoActivo, setProductoActivo]   = useState(null);
  const [modalProducto, setModalProducto]     = useState(null); // null | 'nuevo' | producto
  const [eliminandoId, setEliminandoId]       = useState(null);

  useEffect(() => {
    api.get('/productos/')
      .then(r => setProductos(r.data))
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const catOk = categoriaFiltro === 'todas' || p.categoria === categoriaFiltro;
      const busOk = !busqueda.trim() ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.categoria || '').includes(busqueda.toLowerCase()) ||
        (p.descripcion || '').toLowerCase().includes(busqueda.toLowerCase());
      return catOk && busOk;
    });
  }, [productos, categoriaFiltro, busqueda]);

  // Contar por categoría
  const conteo = useMemo(() => {
    const m = { todas: productos.length };
    CATEGORIAS.forEach(cat => {
      m[cat] = productos.filter(p => p.categoria === cat).length;
    });
    return m;
  }, [productos]);

  // ── Handlers de estado ──────────────────────────────────────────────────
  const handlePrecioActualizado = (productoId, medidaId, nuevoPrecio) => {
    setProductos(prev => prev.map(p => {
      if (p.id !== productoId) return p;
      return {
        ...p,
        medidas: p.medidas.map(m =>
          m.id === medidaId ? { ...m, precio_base: nuevoPrecio } : m
        ),
      };
    }));
    if (productoActivo?.id === productoId) {
      setProductoActivo(prev => ({
        ...prev,
        medidas: prev.medidas.map(m =>
          m.id === medidaId ? { ...m, precio_base: nuevoPrecio } : m
        ),
      }));
    }
  };

  const handleMedidaAgregada = (productoId, nuevaMedida) => {
    setProductos(prev => prev.map(p => {
      if (p.id !== productoId) return p;
      const updated = { ...p, medidas: [...p.medidas, nuevaMedida] };
      if (productoActivo?.id === productoId) setProductoActivo(updated);
      return updated;
    }));
  };

  const handleMedidaEliminada = (productoId, medidaId) => {
    setProductos(prev => prev.map(p => {
      if (p.id !== productoId) return p;
      const updated = { ...p, medidas: p.medidas.filter(m => m.id !== medidaId) };
      if (productoActivo?.id === productoId) setProductoActivo(updated);
      return updated;
    }));
  };

  const handleProductoGuardado = (data, esEdicion) => {
    if (esEdicion) {
      setProductos(prev => prev.map(p => p.id === data.id ? { ...p, ...data } : p));
      if (productoActivo?.id === data.id) setProductoActivo(prev => ({ ...prev, ...data }));
    } else {
      setProductos(prev => [...prev, { ...data, medidas: data.medidas ?? [] }]);
    }
  };

  const eliminarProducto = async (producto) => {
    try {
      await api.delete(`/productos/${producto.id}`);
      setProductos(prev => prev.filter(p => p.id !== producto.id));
      if (productoActivo?.id === producto.id) setProductoActivo(null);
      setEliminandoId(null);
    } catch (e) {
      alert(e.response?.data?.detail || 'No se pudo eliminar.');
    }
  };

  const seleccionarProducto = (p) => {
    // Usar la versión más fresca del producto (con medidas actualizadas)
    const fresco = productos.find(x => x.id === p.id) || p;
    setProductoActivo(fresco);
  };

  return (
    <div
      className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      style={{ height: 'calc(100vh - 5rem)' }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid #F1F5F9' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl text-xl"
            style={{ width: 40, height: 40, background: '#FEF3C7' }}
          >
            🖨️
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg leading-tight">Catálogo de Productos</h2>
            <p className="text-xs text-slate-400">{productos.length} productos · Clic en el precio para editar</p>
          </div>
        </div>
        <button
          onClick={() => setModalProducto('nuevo')}
          className="btn-primary flex items-center gap-2"
        >
          <span>+</span> Nuevo Producto
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Panel izquierdo: lista ─────────────────────────────────── */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: 300, borderRight: '1px solid #F1F5F9' }}
        >
          {/* Búsqueda */}
          <div className="px-3 pt-3 pb-2">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto…"
              className="input text-sm"
              style={{ padding: '8px 12px' }}
            />
          </div>

          {/* Filtros de categoría */}
          <div
            className="px-3 pb-2 flex gap-1 flex-wrap"
            style={{ borderBottom: '1px solid #F1F5F9' }}
          >
            {[{ value: 'todas', label: 'Todas', emoji: '📋' },
              ...CATEGORIAS.map(c => ({ value: c, label: c, emoji: CAT_CONFIG[c].emoji }))
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setCategoriaFiltro(opt.value)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={categoriaFiltro === opt.value
                  ? { background: '#0F172A', color: '#fff' }
                  : { background: '#F1F5F9', color: '#64748B' }
                }
              >
                {opt.emoji} {opt.label}
                <span
                  className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
                  style={categoriaFiltro === opt.value
                    ? { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }
                    : { background: '#E2E8F0', color: '#64748B' }
                  }
                >
                  {conteo[opt.value] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Lista de productos */}
          <div className="flex-1 overflow-y-auto">
            {cargando ? (
              <div className="p-4 space-y-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-slate-300">
                <span className="text-4xl mb-2">🔍</span>
                <p className="text-sm text-slate-400">Sin resultados</p>
              </div>
            ) : (
              productosFiltrados.map(p => {
                const cfg = CAT_CONFIG[p.categoria] || { color: '#64748B', bg: '#F8FAFC', emoji: '📄' };
                const estaActivo = productoActivo?.id === p.id;
                const conPrecio  = p.medidas?.filter(m => m.precio_base != null).length ?? 0;
                const totalMedidas = p.medidas?.length ?? 0;

                return (
                  <div key={p.id} className="relative group">
                    {eliminandoId === p.id ? (
                      <div
                        className="px-4 py-3"
                        style={{ background: '#FEF2F2', borderBottom: '1px solid #FEE2E2', borderLeft: '3px solid #EF4444' }}
                      >
                        <p className="text-xs font-semibold text-red-700 mb-1 truncate">
                          ¿Eliminar "{p.nombre}"?
                        </p>
                        <p className="text-xs text-red-400 mb-2">No se puede deshacer.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => eliminarProducto(p)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ background: '#EF4444' }}
                          >
                            Eliminar
                          </button>
                          <button
                            onClick={() => setEliminandoId(null)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 bg-white"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => seleccionarProducto(p)}
                        className="w-full text-left px-4 py-3.5 transition-all relative"
                        style={{
                          background:   estaActivo ? '#FFFBEB' : 'transparent',
                          borderLeft:   `3px solid ${estaActivo ? '#D97706' : 'transparent'}`,
                          borderBottom: '1px solid #F8FAFC',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="flex items-center justify-center rounded-xl flex-shrink-0 text-base"
                              style={{
                                width: 34, height: 34,
                                background: estaActivo ? cfg.bg : '#F8FAFC',
                              }}
                            >
                              {cfg.emoji}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-700 text-sm truncate leading-tight">
                                {p.nombre}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                                  style={{ background: cfg.bg, color: cfg.color }}
                                >
                                  {p.categoria}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {conPrecio}/{totalMedidas} con precio
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setEliminandoId(p.id); }}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition flex-shrink-0 ml-1 text-xs"
                          >
                            🗑
                          </button>
                        </div>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Panel derecho: detalle ─────────────────────────────────── */}
        <div className="flex-1 overflow-hidden p-6 bg-slate-50">
          {!productoActivo ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <span className="text-6xl mb-3">👈</span>
              <p className="text-base font-medium text-slate-400">Seleccioná un producto</p>
              <p className="text-sm text-slate-300 mt-1">Para ver y editar sus medidas y precios</p>
            </div>
          ) : (
            <PanelProducto
              key={productoActivo.id}
              producto={productoActivo}
              onPrecioActualizado={handlePrecioActualizado}
              onMedidaAgregada={handleMedidaAgregada}
              onMedidaEliminada={handleMedidaEliminada}
              onEditar={() => setModalProducto(productoActivo)}
            />
          )}
        </div>
      </div>

      {/* ── Modales ───────────────────────────────────────────────────── */}
      {modalProducto && (
        <ModalProductoForm
          producto={modalProducto === 'nuevo' ? null : modalProducto}
          onCerrar={() => setModalProducto(null)}
          onGuardado={handleProductoGuardado}
        />
      )}
    </div>
  );
};

export default ProductosPage;