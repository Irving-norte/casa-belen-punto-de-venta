import type { Producto, TipoCliente } from './tipos'

/**
 * Precio unitario de un producto con precio definido. Regresa `null` para
 * los productos variables: su precio lo captura el vendedor al vender.
 */
export function precioDeLista(producto: Producto, tipoCliente: TipoCliente): number | null {
  const { precio } = producto
  switch (precio.tipo) {
    case 'fijo':
      return precio.centavos
    case 'tarifas':
      return tipoCliente === 'alumno' ? precio.alumno : precio.general
    case 'variable':
      return null
  }
}

export function esVariable(producto: Producto): boolean {
  return producto.precio.tipo === 'variable'
}

/** true si el precio capturado queda dentro del rango del producto variable. */
export function dentroDeRango(producto: Producto, centavos: number): boolean {
  if (producto.precio.tipo !== 'variable') return true
  return centavos >= producto.precio.minimo && centavos <= producto.precio.maximo
}
