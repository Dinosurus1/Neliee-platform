/**
 * Dado un objeto orden, devuelve { precioUnitario, subtotal }.
 *
 * El backend guarda el precio negociado en orden.precio_unitario
 * (se edita inline desde la tabla de Datasync).
 * medida.precio_base es solo el precio SUGERIDO al crear la orden,
 * no el precio final — por eso no lo leemos acá.
 */
export const calcPrecioOrden = (orden) => {
  const precioUnitario = orden.precio_unitario ?? null;
  const subtotal =
    precioUnitario !== null
      ? precioUnitario * (orden.cantidad ?? 1)
      : null;

  return { precioUnitario, subtotal };
};

/**
 * Formatea un número como moneda COP sin decimales.
 * Ej: 25000 → "$25.000"
 */
export const COP = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(v ?? 0);