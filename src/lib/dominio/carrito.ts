import type { LineaVenta, Producto, TipoCliente } from './tipos'
import { dentroDeRango, precioDeLista } from './precios'

/**
 * Operaciones puras sobre las líneas de una venta en curso. Nunca mutan:
 * siempre regresan un arreglo nuevo.
 */

export function subtotal(linea: LineaVenta): number {
  return linea.precioUnitario * linea.cantidad
}

export function totalDe(lineas: LineaVenta[]): number {
  return lineas.reduce((suma, l) => suma + subtotal(l), 0)
}

export function piezasDe(lineas: LineaVenta[]): number {
  return lineas.reduce((suma, l) => suma + l.cantidad, 0)
}

/** Dos líneas se juntan si son el mismo producto, variante y precio. */
function mismaLinea(a: LineaVenta, b: LineaVenta): boolean {
  return (
    a.productoId === b.productoId &&
    a.variante === b.variante &&
    a.precioUnitario === b.precioUnitario
  )
}

/**
 * Agrega un producto. `precioCapturado` es obligatorio para productos
 * variables e ignorado para los demás (su precio sale del catálogo).
 */
export function agregar(
  lineas: LineaVenta[],
  producto: Producto,
  tipoCliente: TipoCliente,
  opciones: { variante?: string; precioCapturado?: number } = {},
): LineaVenta[] {
  const deLista = precioDeLista(producto, tipoCliente)
  const precioUnitario = deLista ?? opciones.precioCapturado
  if (precioUnitario == null || precioUnitario <= 0) {
    throw new Error(`Falta el precio de "${producto.nombre}"`)
  }

  const nueva: LineaVenta = {
    productoId: producto.id,
    nombre: producto.nombre,
    categoriaId: producto.categoriaId,
    ...(opciones.variante ? { variante: opciones.variante } : {}),
    cantidad: 1,
    precioUnitario,
    precioCapturado: deLista == null,
    ...(deLista == null && !dentroDeRango(producto, precioUnitario) ? { fueraDeRango: true } : {}),
  }

  const i = lineas.findIndex((l) => mismaLinea(l, nueva))
  if (i === -1) return [...lineas, nueva]
  return lineas.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + 1 } : l))
}

export function cambiarCantidad(lineas: LineaVenta[], indice: number, cantidad: number): LineaVenta[] {
  if (cantidad <= 0) return quitar(lineas, indice)
  return lineas.map((l, j) => (j === indice ? { ...l, cantidad: Math.floor(cantidad) } : l))
}

export function quitar(lineas: LineaVenta[], indice: number): LineaVenta[] {
  return lineas.filter((_, j) => j !== indice)
}

/**
 * Al cambiar General ↔ Alumno antes de cobrar, las líneas con precio de
 * catálogo se recalculan. Las de precio capturado se respetan.
 */
export function recalcularPorTipoCliente(
  lineas: LineaVenta[],
  tipoCliente: TipoCliente,
  buscar: (id: string) => Producto | undefined,
): LineaVenta[] {
  return lineas.map((l) => {
    if (l.precioCapturado) return l
    const producto = buscar(l.productoId)
    const precio = producto ? precioDeLista(producto, tipoCliente) : null
    return precio == null ? l : { ...l, precioUnitario: precio }
  })
}
