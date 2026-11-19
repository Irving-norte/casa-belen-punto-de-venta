import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  contarPendientes,
  leerEstado,
  leerVinculacion,
  type EstadoSincronizacion,
  type Vinculacion,
} from '../db/hoja.repo'
import { sincronizar, type ResultadoSincronizacion } from '../sincronizacion/sincronizar'

export interface Sincronizacion {
  /** `undefined` mientras carga; `null` si la tablet no está vinculada. */
  vinculacion: Vinculacion | null | undefined
  pendientes: { ventas: number; gastos: number; cajas: number; total: number }
  estado: EstadoSincronizacion
  sincronizando: boolean
  enLinea: boolean
  sincronizarAhora: () => Promise<ResultadoSincronizacion>
}

const Contexto = createContext<Sincronizacion | null>(null)

/** Cada cuánto se reintenta y se refresca el catálogo, aunque no haya ventas. */
const CADA_MS = 3 * 60_000
/** Espera tras una venta o gasto nuevos, por si vienen varios seguidos. */
const ESPERA_TRAS_CAMBIO_MS = 1_500

const SIN_PENDIENTES = { ventas: 0, gastos: 0, cajas: 0, total: 0 }

function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine)
    window.addEventListener('online', actualizar)
    window.addEventListener('offline', actualizar)
    return () => {
      window.removeEventListener('online', actualizar)
      window.removeEventListener('offline', actualizar)
    }
  }, [])
  return enLinea
}

/**
 * Sincroniza sola: al abrir la app, al volver el internet, poco después de
 * cada venta, gasto o corte, y cada pocos minutos. También a mano
 * (`sincronizarAhora`).
 */
export function ProveedorSincronizacion({ children }: { children: ReactNode }) {
  const vinculacion = useLiveQuery(async () => (await leerVinculacion()) ?? null, [])
  const pendientes = useLiveQuery(contarPendientes, []) ?? SIN_PENDIENTES
  const estado = useLiveQuery(leerEstado, []) ?? { rechazados: [] }
  const enLinea = useEnLinea()
  const [sincronizando, setSincronizando] = useState(false)

  const sincronizarAhora = useCallback(async () => {
    setSincronizando(true)
    try {
      return await sincronizar()
    } finally {
      setSincronizando(false)
    }
  }, [])

  const vinculada = !!vinculacion
  const url = vinculacion?.url

  // Al vincular, al abrir la app, al volver el internet y cada pocos minutos.
  useEffect(() => {
    if (!vinculada || !enLinea) return
    void sincronizarAhora()
    const intervalo = setInterval(() => void sincronizarAhora(), CADA_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible') void sincronizarAhora()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [vinculada, url, enLinea, sincronizarAhora])

  // Poco después de que aparece algo nuevo por subir.
  const anterior = useRef(pendientes.total)
  useEffect(() => {
    const crecio = pendientes.total > anterior.current
    anterior.current = pendientes.total
    if (!crecio || !vinculada || !enLinea) return
    const t = setTimeout(() => void sincronizarAhora(), ESPERA_TRAS_CAMBIO_MS)
    return () => clearTimeout(t)
  }, [pendientes.total, vinculada, enLinea, sincronizarAhora])

  const valor = useMemo<Sincronizacion>(
    () => ({ vinculacion, pendientes, estado, sincronizando, enLinea, sincronizarAhora }),
    [vinculacion, pendientes, estado, sincronizando, enLinea, sincronizarAhora],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSincronizacion(): Sincronizacion {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useSincronizacion fuera de ProveedorSincronizacion')
  return valor
}
