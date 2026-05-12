/**
 * Dado un objeto orden (con orden.producto.medidas y orden.medida_id),
 * devuelve { medida, precioUnitario, subtotal }.
 *
 * Si la orden no tiene medida asignada o la medida no tiene precio_base,
 * los valores numéricos serán null.
 */
export const calcPrecioOrden = (orden) => {
  const medida = orden.producto?.medidas?.find(m => m.id === orden.medida_id) ?? null;
  const precioUnitario = medida?.precio_base ?? null;
  const subtotal =
    precioUnitario !== null
      ? precioUnitario * (orden.cantidad ?? 1)
      : null;

  return { medida, precioUnitario, subtotal };
};

/**
 * Formatea un número como moneda COP sin decimales.
 * Ej: 25000 → "$25.000"
 */
export const COP = (v) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(v ?? 0);