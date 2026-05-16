import { useState } from 'react';
import api from '../../../../api/dashboardService';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const FormCliente = ({ onClienteCreado }) => {
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '', es_cliente_regular: false,
  });
  const [telefonoError, setTelefonoError] = useState('');
  const [cargando, setCargando]           = useState(false);
  const [error, setError]                 = useState('');
  const [exito, setExito]                 = useState(false);

  const manejarCambio = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const manejarCambioTelefono = (valor) => {
    setForm(prev => ({ ...prev, telefono: valor || '' }));
    if (telefonoError) setTelefonoError('');
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError(''); setExito(false);

    if (!form.nombre.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/.test(form.nombre.trim())) {
      setError('El nombre solo debe contener letras, sin números ni símbolos.');
      return;
    }
    if (!form.telefono) {
      setTelefonoError('El número de teléfono es obligatorio.');
      return;
    }
    if (!isValidPhoneNumber(form.telefono)) {
      setTelefonoError('El número de teléfono no es válido para el país seleccionado.');
      return;
    }

    setCargando(true);
    try {
      await api.post('/clientes/', form);
      setExito(true);
      setForm({ nombre: '', email: '', telefono: '', es_cliente_regular: false });
      setTelefonoError('');
      setTimeout(() => setExito(false), 4000);
      if (onClienteCreado) onClienteCreado();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear el cliente.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={manejarEnvio}>

      {/* Nombre */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Nombre <span className="text-red-400">*</span>
        </label>
        <input
          type="text" name="nombre" value={form.nombre}
          onChange={manejarCambio}
          placeholder="Ej: Empresa XYZ"
          className="input"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Email
        </label>
        <input
          type="email" name="email" value={form.email}
          onChange={manejarCambio}
          placeholder="cliente@empresa.com"
          className="input"
        />
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Teléfono <span className="text-red-400">*</span>
        </label>
        <div
          className="rounded-xl border transition-all duration-150 overflow-hidden"
          style={{
            border: telefonoError ? '1.5px solid #FCA5A5' : '1.5px solid #E2E8F0',
            background: '#F8FAFC',
          }}
        >
          <PhoneInput
            international
            defaultCountry="CO"
            countryCallingCodeEditable={true}
            value={form.telefono}
            onChange={manejarCambioTelefono}
            style={{
              '--PhoneInputCountryFlag-height': '14px',
              '--PhoneInput-color--focus': '#F59E0B',
              padding: '8px 14px',
              fontSize: 14,
              background: 'transparent',
            }}
          />
        </div>
        {telefonoError ? (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            ⚠️ {telefonoError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400">
            Seleccioná el país e ingresá el número
          </p>
        )}
      </div>

      {/* Toggle cliente regular */}
      <label
        className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all"
        style={{
          background: form.es_cliente_regular ? '#FEF3C7' : '#F8FAFC',
          border: `1.5px solid ${form.es_cliente_regular ? '#FDE68A' : '#E2E8F0'}`,
        }}
      >
        <div className="relative flex-shrink-0" style={{ width: 42, height: 24 }}>
          <input
            type="checkbox" name="es_cliente_regular"
            checked={form.es_cliente_regular}
            onChange={manejarCambio}
            className="sr-only"
          />
          <div
            className="rounded-full transition-all duration-200"
            style={{ width: 42, height: 24, background: form.es_cliente_regular ? '#D97706' : '#CBD5E1' }}
          />
          <div
            className="absolute top-[3px] rounded-full bg-white shadow transition-all duration-200"
            style={{ width: 18, height: 18, left: form.es_cliente_regular ? 21 : 3 }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">Cliente regular / habitual</p>
          <p className="text-xs text-slate-400">Aparecerá marcado con ⭐</p>
        </div>
      </label>

      {error && (
        <div className="text-xs p-3 rounded-xl flex items-start gap-2"
          style={{ background: '#FEF2F2', color: '#991B1B' }}>
          <span>⚠️</span><span>{error}</span>
        </div>
      )}
      {exito && (
        <div className="text-xs p-3 rounded-xl flex items-start gap-2"
          style={{ background: '#ECFDF5', color: '#065F46' }}>
          <span>✅</span><span>Cliente creado con éxito.</span>
        </div>
      )}

      <button type="submit" disabled={cargando} className="btn-primary w-full">
        {cargando ? '⏳ Guardando...' : '✔ Crear Cliente'}
      </button>
    </form>
  );
};

export default FormCliente;