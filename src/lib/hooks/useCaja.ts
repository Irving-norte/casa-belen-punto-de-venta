import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { cajaAbierta } from '../db/caja.repo'

/**
 * `undefined` mientras carga, `null` si no hay caja abierta.
 * Se actualiza solo cuando cambia la base local.
 */
export function useCajaAbierta() {
  return useLiveQuery(async () => (await cajaAbierta()) ?? null, [])
}

export function useVentasDeCaja(cajaId: string | undefined) {
  return useLiveQuery(
    async () =>
      cajaId ? (await db.ventas.where('cajaId').equals(cajaId).sortBy('creadaEn')).reverse() : [],
    [cajaId],
  )
}

export function useGastosDeCaja(cajaId: string | undefined) {
  return useLiveQuery(
    async () =>
      cajaId ? (await db.gastos.where('cajaId').equals(cajaId).sortBy('creadoEn')).reverse() : [],
    [cajaId],
  )
}

export function useVenta(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.ventas.get(id)) ?? null) : null), [id])
}

export function useUltimaCajaCerrada() {
  return useLiveQuery(async () => {
    const cajas = await db.cajas.orderBy('abiertaEn').reverse().toArray()
    return cajas.find((c) => c.cerradaEn != null) ?? null
  }, [])
}
