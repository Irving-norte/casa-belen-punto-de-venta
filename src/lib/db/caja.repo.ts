import { db } from './db'
import type { Caja, Gasto, LineaVenta, Pago, TipoCliente, Venta } from '../dominio/tipos'
import { calcularCorte } from '../dominio/corte'
import { totalDe } from '../dominio/carrito'
import { abonado } from '../dominio/pagos'

const CLAVE_FOLIO = 'siguienteFolio'

export async function cajaAbierta(): Promise<Caja | undefined> {
  const cajas = await db.cajas.orderBy('abiertaEn').reverse().toArray()
  return cajas.find((c) => c.cerradaEn == null)
}

export async function abrirCaja(fondoInicial: number): Promise<Caja> {
  if (!Number.isInteger(fondoInicial) || fondoInicial < 0) {
    throw new Error('El fondo inicial no es válido')
  }
  return db.transaction('rw', db.cajas, async () => {
    if (await cajaAbierta()) throw new Error('Ya hay una caja abierta')
    const caja: Caja = {
      id: crypto.randomUUID(),
      abiertaEn: Date.now(),
      fondoInicial,
      sincronizada: 0,
    }
    await db.cajas.add(caja)
    return caja
  })
}

export interface DatosVenta {
  tipoCliente: TipoCliente
  lineas: LineaVenta[]
  pagos: Pago[]
  cambio: number
}

/**
 * Guarda una venta cobrada. El folio se asigna dentro de la misma
 * transacción, así dos ventas nunca comparten número.
 */
export async function guardarVenta(datos: DatosVenta): Promise<Venta> {
  const total = totalDe(datos.lineas)
  if (datos.lineas.length === 0) throw new Error('La venta no tiene productos')
  if (abonado(datos.pagos) !== total) throw new Error('Los pagos no cubren el total')

  return db.transaction('rw', db.cajas, db.ventas, db.meta, async () => {
    const caja = await cajaAbierta()
    if (!caja) throw new Error('No hay caja abierta')

    const registro = await db.meta.get(CLAVE_FOLIO)
    const folio = typeof registro?.valor === 'number' ? registro.valor : 1
    await db.meta.put({ clave: CLAVE_FOLIO, valor: folio + 1 })

    const venta: Venta = {
      id: crypto.randomUUID(),
      folio,
      cajaId: caja.id,
      creadaEn: Date.now(),
      tipoCliente: datos.tipoCliente,
      lineas: datos.lineas,
      total,
      pagos: datos.pagos,
      cambio: datos.cambio,
      sincronizada: 0,
    }
    await db.ventas.add(venta)
    return venta
  })
}

export async function marcarTicketEnviado(ventaId: string, telefono?: string): Promise<void> {
  await db.ventas.update(ventaId, {
    ticketEnviadoEn: Date.now(),
    ...(telefono ? { telefonoCliente: telefono } : {}),
  })
}

export async function registrarGasto(concepto: string, monto: number, nota?: string): Promise<Gasto> {
  const limpio = concepto.trim()
  if (!limpio) throw new Error('Escribe el concepto del gasto')
  if (!Number.isInteger(monto) || monto <= 0) throw new Error('Escribe un monto mayor a cero')

  return db.transaction('rw', db.cajas, db.gastos, async () => {
    const caja = await cajaAbierta()
    if (!caja) throw new Error('No hay caja abierta')
    const gasto: Gasto = {
      id: crypto.randomUUID(),
      cajaId: caja.id,
      creadoEn: Date.now(),
      concepto: limpio,
      monto,
      ...(nota?.trim() ? { nota: nota.trim() } : {}),
      sincronizado: 0,
    }
    await db.gastos.add(gasto)
    return gasto
  })
}

export async function cerrarCaja(efectivoContado: number): Promise<Caja> {
  if (!Number.isInteger(efectivoContado) || efectivoContado < 0) {
    throw new Error('El efectivo contado no es válido')
  }
  return db.transaction('rw', db.cajas, db.ventas, db.gastos, async () => {
    const caja = await cajaAbierta()
    if (!caja) throw new Error('No hay caja abierta')
    const [ventas, gastos] = await Promise.all([
      db.ventas.where('cajaId').equals(caja.id).toArray(),
      db.gastos.where('cajaId').equals(caja.id).toArray(),
    ])
    const cerrada: Caja = {
      ...caja,
      cerradaEn: Date.now(),
      corte: calcularCorte(caja, ventas, gastos, efectivoContado),
      sincronizada: 0,
    }
    await db.cajas.put(cerrada)
    return cerrada
  })
}
