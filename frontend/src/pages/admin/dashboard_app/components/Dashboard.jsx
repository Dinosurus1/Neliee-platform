import { useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/main.css';
import api from '../../../../api/dashboardService';
import FormOrden from './FormOrden';
import FormCliente from './FormCliente';
import Datasync from './Datasync';
import OrdenesChart from './OrdenesChart';
 
const ESTADO_CONFIG = [
  { estado: 'Pendiente',  emoji: '⏳', accent: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
  { estado: 'En proceso', emoji: '⚙️', accent: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  { estado: 'Listo',      emoji: '✅', accent: '#10B981', bg: '#ECFDF5', text: '#065F46' },
  { estado: 'Entregado',  emoji: '📦', accent: '#94A3B8', bg: '#F8FAFC', text: '#475569' },
];
 
const useTopStats = () => {
  const [clienteTop, setClienteTop]   = useState(null);
  const [productoTop, setProductoTop] = useState(null);
  const [cargando, setCargando]       = useState(true);
 
  useEffect(() => {
    Promise.all([
      api.get('/estadisticas/clientes-regulares?limite=1'),
      api.get('/estadisticas/productos-populares?limite=1'),
    ])
      .then(([rc, rp]) => {
        setClienteTop(rc.data[0] || null);
        setProductoTop(rp.data[0] || null);
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);
 
  return { clienteTop, productoTop, cargando };
};
 
const Dashboard = () => {
  const [clientes, setClientes]   = useState([]);
  const [productos, setProductos] = useState([]);
  const [ordenes, setOrdenes]     = useState([]);
  const [formTab, setFormTab]     = useState('orden');
 
  // ✅ FIX: contador que Datasync usa para saber cuándo recargar
  const [refreshTrigger, setRefreshTrigger] = useState(0);
 
  const { clienteTop, productoTop, cargando: cargandoTop } = useTopStats();
 
  const cargarClientes = useCallback(() => {
    api.get('/clientes/').then(r => setClientes(r.data)).catch(console.error);
  }, []);
 
  const cargarProductos = useCallback(() => {
    api.get('/productos/').then(r => setProductos(r.data)).catch(console.error);
  }, []);
 
  const cargarOrdenes = useCallback(() => {
    api.get('/ordenes/').then(r => setOrdenes(r.data)).catch(console.error);
  }, []);
 
  useEffect(() => {
    cargarClientes();
    cargarProductos();
    cargarOrdenes();
  }, []);
 
  // ✅ FIX: cuando se crea una orden nueva, incrementa el trigger y actualiza el chart
  const handleOrdenCreada = useCallback(() => {
    setRefreshTrigger(n => n + 1);
    cargarOrdenes(); // actualiza también el gráfico y los contadores
  }, [cargarOrdenes]);
 
  const conteoPorEstado = useMemo(() => {
    const map = {};
    ordenes.forEach(o => { map[o.estado] = (map[o.estado] || 0) + 1; });
    return map;
  }, [ordenes]);
 
  return (
    <>
      <div className="space-y-5">
 
        {/* ── Fila 1: Estado de órdenes ───────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ESTADO_CONFIG.map(cfg => (
            <div
              key={cfg.estado}
              className="card p-4 flex items-center gap-3"
              style={{ borderLeft: `4px solid ${cfg.accent}` }}
            >
              <div
                className="flex items-center justify-center rounded-xl text-lg flex-shrink-0"
                style={{ width: 44, height: 44, background: cfg.bg }}
              >
                {cfg.emoji}
              </div>
              <div>
                <p className="font-bold text-2xl leading-none" style={{ color: cfg.text }}>
                  {conteoPorEstado[cfg.estado] || 0}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">{cfg.estado}</p>
              </div>
            </div>
          ))}
        </div>
 
        {/* ── Fila 2: Top cliente + Producto estrella ─────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card p-5" style={{ borderLeft: '4px solid #3B82F6' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              Cliente más frecuente
            </p>
            {cargandoTop ? (
              <div className="space-y-2 pt-1">
                <div className="h-6 bg-slate-700 rounded-lg w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-700 rounded-lg w-1/2 animate-pulse" />
              </div>
            ) : clienteTop ? (
              <>
                <p className="text-xl font-bold text-[#f8d7b4]">
                  {clienteTop.nombre_cliente}
                  {clienteTop.es_cliente_regular && <span className="ml-1.5">⭐</span>}
                </p>
                <p className="text-sm text-slate-300 mt-0.5">
                  {clienteTop.total_ordenes} órdenes en total
                </p>
              </>
            ) : (
              <p className="text-slate-400 text-sm mt-1">Sin datos todavía</p>
            )}
          </div>
 
          <div className="card p-5" style={{ borderLeft: '4px solid #10B981' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              Producto estrella
            </p>
            {cargandoTop ? (
              <div className="space-y-2 pt-1">
                <div className="h-6 bg-slate-700 rounded-lg w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-700 rounded-lg w-1/2 animate-pulse" />
              </div>
            ) : productoTop ? (
              <>
                <p className="text-xl font-bold text-[#f8d7b4]">{productoTop.nombre_producto}</p>
                <p className="text-sm text-slate-300 mt-0.5">
                  {productoTop.total_ordenes} órdenes
                  {productoTop.categoria && ` · ${productoTop.categoria}`}
                </p>
              </>
            ) : (
              <p className="text-slate-400 text-sm mt-1">Sin datos todavía</p>
            )}
          </div>
        </div>
 
        {/* ── Fila 3: Gráfica ─────────────────────────────────────── */}
        <OrdenesChart ordenes={ordenes} />
 
        {/* ── Fila 4: Formularios + Tabla ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
 
          {/* Columna izquierda */}
          <div className="lg:col-span-1 flex flex-col gap-4">
 
            {/* Tab toggle */}
            <div className="card p-1.5 flex gap-1">
              <button
                className={`tab-pill ${formTab === 'orden' ? 'active' : ''}`}
                onClick={() => setFormTab('orden')}
              >
                📋 Nueva Orden
              </button>
              <button
                className={`tab-pill ${formTab === 'cliente' ? 'active' : ''}`}
                onClick={() => setFormTab('cliente')}
              >
                ➕ Nuevo Cliente
              </button>
            </div>
 
            <div className="card p-5">
              {formTab === 'orden' ? (
                <>
                  <h2 className="font-bold text-[#f8d7b4] text-base mb-4 flex items-center gap-2">
                    <span style={{ width:28, height:28, background:'#FEF3C7', color:'#D97706',
                                   display:'flex', alignItems:'center', justifyContent:'center',
                                   borderRadius:8, fontSize:14 }}>📋</span>
                    Registrar Orden
                  </h2>
                  {/* ✅ FIX: se pasa onOrdenCreada al formulario */}
                  <FormOrden
                    clientes={clientes}
                    productos={productos}
                    onOrdenCreada={handleOrdenCreada}
                  />
                </>
              ) : (
                <>
                  <h2 className="font-bold text-[#f8d7b4] text-base mb-4 flex items-center gap-2">
                    <span style={{ width:28, height:28, background:'#EFF6FF', color:'#3B82F6',
                                   display:'flex', alignItems:'center', justifyContent:'center',
                                   borderRadius:8, fontSize:14 }}>👤</span>
                    Nuevo Cliente
                  </h2>
                  <FormCliente onClienteCreado={cargarClientes} />
                </>
              )}
            </div>
          </div>
 
          {/* Columna derecha: tabla */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(192, 150, 107, 0.2)' }}
            >
              <h2 className="font-bold text-[#f8d7b4] text-base flex items-center gap-2">
                <span style={{ color: '#D97706' }}>🏭</span>
                Órdenes en producción
              </h2>
            </div>
            <div className="p-4">
              {/* ✅ FIX: se pasa refreshTrigger para que Datasync recargue al crear orden */}
              <Datasync refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
 
export default Dashboard;
 