import { useState, useRef, useEffect } from 'react';
import api from '../../../../api/dashboardService';
import ModalProducto from './ModalProducto';
import { COP } from '../utils/finanzas';

// ── Item vacío por defecto ────────────────────────────────────────────────
const nuevoItem = () => ({
  id: crypto.randomUUID(),       // clave React local, no va al backend
  seleccion: null,               // { producto, medida }
  cantidad: '',
  precioUnitario: '',
});

const FormOrden = ({ clientes = [], productos = [], onOrdenCreada }) => {
  const [clienteId, setClienteId]     = useState('');
  const [items, setItems]             = useState([nuevoItem()]);  // lista de productos
  const [notas, setNotas]             = useState('');
  const [archivo, setArchivo]         = useState(null);
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [cargando, setCargando]       = useState(false);
  const [exito, setExito]             = useState(false);
  const [avisoArchivo, setAvisoArchivo] = useState(false);
  const [error, setError]             = useState('');

  // índice del item que está eligiendo producto en el modal
  const [modalIdx, setModalIdx]       = useState(null);

  const archivoInputRef = useRef(null);
  const enviandoRef     = useRef(false);

  // ── Helpers de items ──────────────────────────────────────────────────
  const actualizarItem = (idx, cambios) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...cambios } : it));

  const eliminarItem = (idx) =>
    setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const agregarItem = () => setItems(prev => [...prev, nuevoItem()]);

  // ── Cuando cambia la selección de medida, pre-cargar precio ──────────
  const seleccionarProducto = (idx, sel) => {
    actualizarItem(idx, {
      seleccion: sel,
      precioUnitario: sel?.medida?.precio_base != null
        ? String(sel.medida.precio_base)
        : '',
    });
    setModalIdx(null);
  };

  // ── Total general ─────────────────────────────────────────────────────
  const totalGeneral = items.reduce((acc, it) => {
    const p = parseFloat(it.precioUnitario);
    const q = parseInt(it.cantidad) || 1;
    return !isNaN(p) && p > 0 ? acc + p * q : acc;
  }, 0);

  // ── Reset ─────────────────────────────────────────────────────────────
  const reset = () => {
    setClienteId('');
    setItems([nuevoItem()]);
    setNotas('');
    setArchivo(null);
    setFechaEntrega('');
    setError('');
    setAvisoArchivo(false);
    if (archivoInputRef.current) archivoInputRef.current.value = '';
  };

  // ── Enviar ────────────────────────────────────────────────────────────
  const enviar = async (e) => {
    e.preventDefault();
    if (enviandoRef.current) return;

    setError(''); setExito(false); setAvisoArchivo(false);

    // Validaciones
    if (!clienteId) return setError('Seleccioná un cliente.');
    const itemsValidos = items.filter(it => it.seleccion?.producto);
    if (itemsValidos.length === 0) return setError('Agregá al menos un producto.');

    enviandoRef.current = true;
    setCargando(true);

    let algunArchivoFallo = false;

    try {
      // Un POST por cada item — el backend no cambia
      for (const it of itemsValidos) {
        const formData = new FormData();
        formData.append('cliente_id', parseInt(clienteId));
        formData.append('producto_id', it.seleccion.producto.id);
        if (it.seleccion.medida?.id) formData.append('medida_id', it.seleccion.medida.id);
        if (it.cantidad)             formData.append('cantidad', parseInt(it.cantidad));
        if (notas)                   formData.append('notas', notas);
        formData.append('estado', 'Pendiente');

        const precio = parseFloat(it.precioUnitario);
        if (!isNaN(precio) && precio > 0) formData.append('precio_unitario', precio);

        // El archivo solo se adjunta al primer item para no duplicar
        if (archivo && it === itemsValidos[0]) formData.append('archivo', archivo);

        const { data: ordenCreada } = await api.post('/ordenes/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (it === itemsValidos[0] && archivo && !ordenCreada.archivos?.length) {
          algunArchivoFallo = true;
        }
      }

      if (algunArchivoFallo) {
        setAvisoArchivo(true);
      } else {
        setExito(true);
        setTimeout(() => setExito(false), 4000);
      }

      reset();
      if (onOrdenCreada) onOrdenCreada();

    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la orden.');
      console.error(err);
    } finally {
      setCargando(false);
      enviandoRef.current = false;
    }
  };

  return (
    <>
      <form onSubmit={enviar} className="space-y-4">

        {/* ── Cliente ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Cliente <span className="text-red-400">*</span>
          </label>
          <select
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            className="input"
          >
            <option value="">— Seleccioná un cliente —</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.es_cliente_regular ? ' ⭐' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ── Lista de productos ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Productos <span className="text-red-400">*</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {items.filter(it => it.seleccion).length} seleccionado(s)
            </span>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <ItemProducto
                key={it.id}
                item={it}
                idx={idx}
                total={items.length}
                onAbrirModal={() => setModalIdx(idx)}
                onCambiar={(cambios) => actualizarItem(idx, cambios)}
                onEliminar={() => eliminarItem(idx)}
              />
            ))}
          </div>

          {/* Botón agregar */}
          <button
            type="button"
            onClick={agregarItem}
            className="mt-2 w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-600 transition-all"
            style={{ border: '2px dashed #CBD5E1', background: '#FAFAFA' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#F59E0B'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#CBD5E1'}
          >
            ＋ Agregar otro producto
          </button>
        </div>

        {/* ── Total general ── */}
        {totalGeneral > 0 && (
          <div
            className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
          >
            <span className="text-xs font-medium text-amber-700">
              Total estimado ({items.filter(it => it.seleccion).length} producto(s))
            </span>
            <span className="text-sm font-bold text-amber-800">{COP(totalGeneral)}</span>
          </div>
        )}

        {/* ── Fecha de entrega ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Fecha de entrega
          </label>
          <input
            type="date"
            className="input"
            value={fechaEntrega}
            onChange={e => setFechaEntrega(e.target.value)}
          />
        </div>

        {/* ── Notas ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Instrucciones / Notas
          </label>
          <textarea
            rows={3}
            placeholder="Colores, acabado, instrucciones especiales…"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            className="input resize-none"
          />
        </div>

        {/* ── Archivo ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Archivo (opcional)
          </label>
          <input
            ref={archivoInputRef}
            type="file"
            accept=".pdf,.ai,.eps,.png,.jpg,.jpeg,.zip,.rar"
            onChange={e => setArchivo(e.target.files[0] || null)}
            className="input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
          />
        </div>

        {/* ── Mensajes ── */}
        {error && (
          <div className="text-xs p-3 rounded-xl" style={{ background: '#FEF2F2', color: '#991B1B' }}>
            ⚠️ {error}
          </div>
        )}

        {avisoArchivo && (
          <div className="text-xs p-3 rounded-xl space-y-1" style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
            <p><strong>✅ Orden(es) creada(s)</strong>, pero el archivo no se pudo subir a OneDrive.</p>
            <p>Podés subir el archivo después desde la columna <strong>Archivo</strong> en la tabla.</p>
          </div>
        )}

        {exito && (
          <div className="text-xs p-3 rounded-xl" style={{ background: '#ECFDF5', color: '#065F46' }}>
            ✅ {items.filter(it => it.seleccion).length > 1
              ? `${items.filter(it => it.seleccion).length} órdenes creadas con éxito`
              : 'Orden creada con éxito'}
          </div>
        )}

        <button type="submit" disabled={cargando} className="btn-primary w-full">
          {cargando
            ? '⏳ Creando...'
            : `✔ Crear ${items.filter(it => it.seleccion).length > 1
                ? `${items.filter(it => it.seleccion).length} Órdenes`
                : 'Orden'}`}
        </button>
      </form>

      {/* Modal de producto — se abre para el item en modalIdx */}
      {modalIdx !== null && (
        <ModalProducto
          productos={productos}
          onSeleccionar={sel => seleccionarProducto(modalIdx, sel)}
          onCerrar={() => setModalIdx(null)}
        />
      )}
    </>
  );
};

// ── Sub-componente: fila de un item ───────────────────────────────────────
const ItemProducto = ({ item, idx, total, onAbrirModal, onCambiar, onEliminar }) => {
  const subtotal = (() => {
    const p = parseFloat(item.precioUnitario);
    const q = parseInt(item.cantidad) || 1;
    return !isNaN(p) && p > 0 ? p * q : null;
  })();

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}
    >
      {/* Encabezado del item */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Producto {idx + 1}
        </span>
        {total > 1 && (
          <button
            type="button"
            onClick={onEliminar}
            className="text-slate-300 hover:text-red-400 text-xs transition-colors"
            title="Eliminar este producto"
          >
            ✕ eliminar
          </button>
        )}
      </div>

      {/* Selector de producto */}
      {item.seleccion ? (
        <div
          className="flex items-start justify-between rounded-xl px-3 py-2.5"
          style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC' }}
        >
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              ✅ {item.seleccion.producto.nombre}
            </p>
            {item.seleccion.medida && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Medida: {item.seleccion.medida.etiqueta}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { onCambiar({ seleccion: null, precioUnitario: '' }); }}
            className="text-emerald-400 hover:text-red-400 text-xs transition-colors ml-2 flex-shrink-0"
          >
            ✕ cambiar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAbrirModal}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-amber-600 transition-all"
          style={{ border: '2px dashed #CBD5E1', background: '#FAFAFA' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#F59E0B'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#CBD5E1'}
        >
          🖨️ Elegir producto y medida
        </button>
      )}

      {/* Cantidad + Precio — solo si hay selección */}
      {item.seleccion && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              placeholder="Ej: 100"
              value={item.cantidad}
              onChange={e => onCambiar({ cantidad: e.target.value })}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Precio unit. (COP)
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
                style={{ pointerEvents: 'none' }}
              >
                $
              </span>
              <input
                type="number"
                min="0"
                step="100"
                placeholder={
                  item.seleccion?.medida?.precio_base
                    ? item.seleccion.medida.precio_base.toLocaleString('es-CO')
                    : '0'
                }
                value={item.precioUnitario}
                onChange={e => onCambiar({ precioUnitario: e.target.value })}
                className="input pl-6 text-sm"
              />
            </div>
            {item.seleccion?.medida?.precio_base != null && (
              <p className="text-[10px] text-amber-500 mt-0.5">
                💡 Sugerido: {COP(item.seleccion.medida.precio_base)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Subtotal del item */}
      {subtotal !== null && (
        <div className="flex justify-end">
          <span className="text-xs text-amber-700 font-semibold">
            Subtotal: {COP(subtotal)}
          </span>
        </div>
      )}
    </div>
  );
};

export default FormOrden;