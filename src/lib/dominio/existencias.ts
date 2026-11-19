import type { Existencias, LineaVenta, Producto, Venta } from './tipos'

/**
 * Existencias: cuántas piezas (o gramos) quedan según la hoja de inventario.
 *
 * La hoja las calcula sumando movimientos; la tablet recibe esa foto al
 * sincronizar y le resta lo vendido que todavía no sube. Nunca bloquean una
 * venta: solo avisan (la hoja puede ir atrasada respecto al anaquel).
 */

export interface Existencia {
  cantidad: number
  unidad: string
}

/**
 * Clave con la que la hoja lleva la existencia. Igual que en el Apps Script
 * (`claveExistencia` en apps-script/Codigo.gs): el artículo, o el ID del
 * producto si lleva la suya, más la variante.
 */
export function claveExistencia(producto: Pick<Producto, 'id' | 'articulo'>, variante?: string): string {
  const base = producto.articulo || producto.id
  return variante ? `${base} | ${variante}` : base
}

/** Lo que una línea resta de su existencia (p. ej. 2 × «Soya 1 kg» = 2000 g). */
export function consumoDeLinea(
  linea: Pick<LineaVenta, 'productoId' | 'variante' | 'cantidad'>,
  producto: Producto | undefined,
): { clave: string; cantidad: number } {
  const p = producto ?? { id: linea.productoId }
  return { clave: claveExistencia(p, linea.variante), cantidad: linea.cantidad * (producto?.descuenta ?? 1) }
}

/** Existencias de la hoja menos lo vendido en la tablet que aún no sube. */
export function existenciasDisponibles(
  hoja: Existencias,
  ventasSinSubir: Pick<Venta, 'lineas'>[],
  buscar: (id: string) => Producto | undefined,
): Existencias {
  const resultado: Existencias = {}
  for (const [clave, e] of Object.entries(hoja)) resultado[clave] = { ...e }
  for (const venta of ventasSinSubir) {
    for (const linea of venta.lineas) {
      const { clave, cantidad } = consumoDeLinea(linea, buscar(linea.productoId))
      const e = resultado[clave]
      if (e) e.cantidad -= cantidad
    }
  }
  return resultado
}

/**
 * Existencia que se muestra en la tarjeta de un producto: la de su artículo
 * o la suma de sus variantes. `null` si la hoja no la conoce.
 */
export function existenciaDeProducto(disponibles: Existencias, producto: Producto): Existencia | null {
  if (!producto.variantes?.length) return disponibles[claveExistencia(producto)] ?? null
  const porVariante = producto.variantes
    .map((v) => disponibles[claveExistencia(producto, v)])
    .filter((e): e is Existencia => !!e)
  if (porVariante.length === 0) return null
  return {
    cantidad: porVariante.reduce((s, e) => s + Math.max(0, e.cantidad), 0),
    unidad: porVariante[0]!.unidad,
  }
}

/**
 * Líneas del carrito que piden más de lo que queda. Regresa, por índice de
 * línea, lo que queda de su existencia (ya sumando lo que piden las demás
 * líneas de la misma existencia).
 */
export function lineasSinExistencia(
  lineas: LineaVenta[],
  disponibles: Existencias,
  buscar: (id: string) => Producto | undefined,
): Map<number, Existencia> {
  const pedido = new Map<string, number>()
  const consumos = lineas.map((l) => consumoDeLinea(l, buscar(l.productoId)))
  for (const c of consumos) pedido.set(c.clave, (pedido.get(c.clave) ?? 0) + c.cantidad)

  const faltan = new Map<number, Existencia>()
  consumos.forEach((c, i) => {
    const e = disponibles[c.clave]
    if (e && (pedido.get(c.clave) ?? 0) > e.cantidad) faltan.set(i, e)
  })
  return faltan
}

const numero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })

/** «3» · «12.5 kg» · «800 g». */
export function formatearCantidad({ cantidad, unidad }: Existencia): string {
  if (unidad === 'g') {
    return cantidad >= 1000 || cantidad <= -1000
      ? `${numero.format(cantidad / 1000)} kg`
      : `${numero.format(cantidad)} g`
  }
  if (unidad === 'pieza' || !unidad) return numero.format(cantidad)
  return `${numero.format(cantidad)} ${unidad}`
}

/** Texto para la tarjeta: «Quedan 3», «Queda 1», «Sin existencias». */
export function textoExistencia(e: Existencia): string {
  if (e.cantidad <= 0) return 'Sin existencias'
  if ((e.unidad === 'pieza' || !e.unidad) && e.cantidad === 1) return 'Queda 1'
  return `Quedan ${formatearCantidad(e)}`
}
