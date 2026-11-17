import type { Caja, Corte, Gasto, Venta } from './tipos'
import { totalPorForma } from './pagos'

/**
 * Efectivo esperado = fondo inicial + ventas en efectivo − gastos.
 * Las ventas en efectivo ya están netas de cambio (solo cuenta lo abonado).
 */
export function calcularCorte(
  caja: Pick<Caja, 'fondoInicial'>,
  ventas: Venta[],
  gastos: Gasto[],
  efectivoContado: number,
): Corte {
  const pagos = ventas.flatMap((v) => v.pagos)
  const ventasEfectivo = totalPorForma(pagos, 'efectivo')
  const ventasTarjeta = totalPorForma(pagos, 'tarjeta')
  const ventasTransferencia = totalPorForma(pagos, 'transferencia')
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const efectivoEsperado = caja.fondoInicial + ventasEfectivo - totalGastos

  return {
    numeroVentas: ventas.length,
    ventasEfectivo,
    ventasTarjeta,
    ventasTransferencia,
    totalVentas: ventasEfectivo + ventasTarjeta + ventasTransferencia,
    gastos: totalGastos,
    efectivoEsperado,
    efectivoContado,
    diferencia: efectivoContado - efectivoEsperado,
  }
}
