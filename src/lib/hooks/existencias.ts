import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { CLAVES_HOJA, type ExistenciasDeHoja } from '../db/hoja.repo'
import { db } from '../db/db'
import { existenciasDisponibles } from '../dominio/existencias'
import type { Existencias } from '../dominio/tipos'
import { useCatalogo } from './catalogo'

/**
 * Existencias para mostrar al vender: las de la hoja menos lo vendido en la
 * tablet que aún no sube. `null` si la tablet nunca las ha recibido.
 */
export function useExistencias(): Existencias | null {
  const { porId } = useCatalogo()
  const datos = useLiveQuery(async () => {
    const guardadas = (await db.meta.get(CLAVES_HOJA.existencias))?.valor as ExistenciasDeHoja | undefined
    if (!guardadas) return null
    const pendientes = await db.ventas.where('sincronizada').equals(0).toArray()
    return { guardadas, pendientes }
  }, [])

  return useMemo(() => {
    if (!datos) return null
    return existenciasDisponibles(datos.guardadas.existencias, datos.pendientes, (id) => porId.get(id))
  }, [datos, porId])
}
