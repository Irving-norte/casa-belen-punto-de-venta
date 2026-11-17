import type { FormaPago, Pago } from './tipos'

export const NOMBRE_FORMA: Record<FormaPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

export interface EstadoCobro {
  total: number
  pagos: Pago[]
  cambio: number
}

export function abonado(pagos: Pago[]): number {
  return pagos.reduce((suma, p) => suma + p.monto, 0)
}

export function pendiente(estado: EstadoCobro): number {
  return Math.max(0, estado.total - abonado(estado.pagos))
}

export function estaPagado(estado: EstadoCobro): boolean {
  return pendiente(estado) === 0
}

/**
 * Registra un pago sobre lo pendiente.
 *  - Efectivo: `entregado` es lo que da el cliente. Si es más que lo
 *    pendiente, se abona solo lo pendiente y el resto es cambio.
 *  - Tarjeta / transferencia: no pueden pasar de lo pendiente (no hay
 *    cambio en esos medios).
 */
export function registrarPago(
  estado: EstadoCobro,
  forma: FormaPago,
  entregado: number,
  referencia?: string,
): EstadoCobro {
  const falta = pendiente(estado)
  if (falta === 0) throw new Error('La venta ya está pagada')
  if (!Number.isInteger(entregado) || entregado <= 0) throw new Error('Escribe un monto mayor a cero')

  if (forma !== 'efectivo' && entregado > falta) {
    throw new Error(`Con ${NOMBRE_FORMA[forma].toLowerCase()} no se puede cobrar más de lo que falta`)
  }

  const monto = Math.min(entregado, falta)
  const cambio = forma === 'efectivo' ? entregado - monto : 0
  const ref = referencia?.trim()
  const pago: Pago = { forma, monto, ...(ref ? { referencia: ref } : {}) }

  return { ...estado, pagos: [...estado.pagos, pago], cambio: estado.cambio + cambio }
}

export function quitarPago(estado: EstadoCobro, indice: number): EstadoCobro {
  // El cambio solo puede venir del último pago (el que cubrió el total),
  // así que al quitar cualquier pago se reinicia.
  return { ...estado, pagos: estado.pagos.filter((_, i) => i !== indice), cambio: 0 }
}

export function totalPorForma(pagos: Pago[], forma: FormaPago): number {
  return pagos.filter((p) => p.forma === forma).reduce((s, p) => s + p.monto, 0)
}
