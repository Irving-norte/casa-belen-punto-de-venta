import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { CATALOGO_ARRANQUE } from '../../data/catalogo'
import { CLAVES_HOJA, type CatalogoDeHoja } from '../db/hoja.repo'
import { db } from '../db/db'
import type { Catalogo, Producto } from '../dominio/tipos'
import type { ErrorDeCatalogo } from '../sincronizacion/protocolo'

export interface CatalogoVigente extends Catalogo {
  porId: ReadonlyMap<string, Producto>
  /** «hoja» si ya se descargó de la hoja; «arranque» si es el que trae la app. */
  origen: 'hoja' | 'arranque'
  generadoEn?: number
  errores: ErrorDeCatalogo[]
  descartados: number
}

const Contexto = createContext<CatalogoVigente | null>(null)

/**
 * El catálogo que usa la tablet: el último que mandó la hoja o, si nunca se
 * ha descargado, el de arranque. No pinta nada mientras lo lee de la base
 * local (milisegundos), para que nunca se vea un precio viejo.
 */
export function ProveedorCatalogo({ children }: { children: ReactNode }) {
  const guardado = useLiveQuery(
    async () => ((await db.meta.get(CLAVES_HOJA.catalogo))?.valor as CatalogoDeHoja | undefined) ?? null,
    [],
  )

  const valor = useMemo<CatalogoVigente | null>(() => {
    if (guardado === undefined) return null
    const base = guardado?.catalogo ?? CATALOGO_ARRANQUE
    return {
      ...base,
      porId: new Map(base.productos.map((p) => [p.id, p])),
      origen: guardado ? 'hoja' : 'arranque',
      generadoEn: guardado?.generadoEn,
      errores: guardado?.errores ?? [],
      descartados: guardado?.descartados ?? 0,
    }
  }, [guardado])

  if (!valor) return null
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useCatalogo(): CatalogoVigente {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useCatalogo fuera de ProveedorCatalogo')
  return valor
}
