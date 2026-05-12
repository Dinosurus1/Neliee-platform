import { useState } from 'react';
import api from '../../../../api/dashboardService';

const ActionCard = ({ icon, title, description, children }) => (
  <div
    className="rounded-2xl p-5"
    style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}
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
  const [importando, setImportando] = useState(false);
  const [mensaje, setMensaje]       = useState('');

  const descargar = (endpoint) => {
    window.open(`http://127.0.0.1:8000${endpoint}`, '_blank');
  };

  const importarDb = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setImportando(true); setMensaje('');
    const form = new FormData();
    form.append('archivo', archivo);
    try {
      const { data } = await api.post('/exportar/importar-db', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMensaje({ tipo: 'ok', texto: data.mensaje });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.detail || 'Error al importar.' });
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div
          className="flex items-center justify-center rounded-xl text-xl"
          style={{ width: 44, height: 44, background: '#FEF3C7' }}
        >
          📦
        </div>
        <div>
          <h2 className="font-bold text-slate-800">Exportar / Importar</h2>
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
            onClick={() => descargar('/exportar/excel')}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: '#059669' }}
            onMouseEnter={e => e.currentTarget.style.background = '#047857'}
            onMouseLeave={e => e.currentTarget.style.background = '#059669'}
          >
            ⬇ Descargar Excel
          </button>
        </ActionCard>

        <ActionCard
          icon="💾"
          title="Backup de Base de Datos"
          description="Descarga el archivo .db completo del sistema"
        >
          <button
            onClick={() => descargar('/exportar/db')}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: '#2563EB' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}
          >
            ⬇ Descargar Backup .db
          </button>
        </ActionCard>

        <ActionCard
          icon="📂"
          title="Restaurar Base de Datos"
          description={
            <span>
              Carga un .db previo —{' '}
              <span className="text-red-400 font-semibold">reemplaza la base actual</span>
            </span>
          }
        >
          <label
            className={`flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              importando ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ background: '#FEF3C7', color: '#92400E',
                     border: '1.5px dashed #FCD34D' }}
          >
            {importando ? '⏳ Importando...' : '📂 Cargar Backup .db'}
            <input
              type="file" accept=".db" className="hidden"
              disabled={importando} onChange={importarDb}
            />
          </label>
        </ActionCard>

        {mensaje && (
          <div
            className="text-xs p-3 rounded-xl flex items-start gap-2"
            style={{
              background: mensaje.tipo === 'ok' ? '#ECFDF5' : '#FEF2F2',
              color: mensaje.tipo === 'ok' ? '#065F46' : '#991B1B',
            }}
          >
            <span>{mensaje.tipo === 'ok' ? '✅' : '❌'}</span>
            <span>{mensaje.texto}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exportar;