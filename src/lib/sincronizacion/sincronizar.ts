import {
  actualizarEstado,
  aplicarRespuesta,
  leerVinculacion,
  tomarPendientes,
} from '../db/hoja.repo'
import { ErrorDeHoja, llamarHoja } from './cliente'
import type { Rechazado } from './protocolo'

export type ResultadoSincronizacion =
  | { estado: 'sin-vincular' }
  | { estado: 'sin-conexion' }
  | { estado: 'ok'; subidas: number; rechazados: Rechazado[] }
  | { estado: 'error'; tipo: string; mensaje: string }

/** Ventas por llamada: Apps Script tiene límite de tiempo por petición. */
const VENTAS_POR_LLAMADA = 40
const VUELTAS_MAXIMAS = 25

let enCurso: Promise<ResultadoSincronizacion> | null = null

/**
 * Sube lo pendiente y descarga catálogo y existencias. Si ya hay una
 * sincronización corriendo, regresa esa misma (nunca corren dos a la vez).
 */
export function sincronizar(): Promise<ResultadoSincronizacion> {
  enCurso ??= ejecutar().finally(() => {
    enCurso = null
  })
  return enCurso
}

export function sincronizando(): boolean {
  return enCurso !== null
}

async function ejecutar(): Promise<ResultadoSincronizacion> {
  const vinculacion = await leerVinculacion()
  if (!vinculacion) return { estado: 'sin-vincular' }
  if (!navigator.onLine) return { estado: 'sin-conexion' }

  await actualizarEstado({ ultimoIntento: Date.now() })
  const rechazados: Rechazado[] = []
  const excluir = new Set<string>()
  let subidas = 0

  try {
    for (let vuelta = 0; vuelta < VUELTAS_MAXIMAS; vuelta++) {
      const { datos, hayMasVentas } = await tomarPendientes(VENTAS_POR_LLAMADA, excluir)
      const respuesta = await llamarHoja(vinculacion, 'sincronizar', datos)
      await aplicarRespuesta(respuesta)

      const aceptados = respuesta.aceptados
      if (aceptados) subidas += aceptados.ventas.length + aceptados.gastos.length + aceptados.cajas.length
      for (const r of respuesta.rechazados ?? []) {
        rechazados.push(r)
        excluir.add(r.id)
      }
      if (!hayMasVentas) break
    }
    await actualizarEstado({ ultimoExito: Date.now(), error: undefined, rechazados })
    return { estado: 'ok', subidas, rechazados }
  } catch (e) {
    const error =
      e instanceof ErrorDeHoja
        ? { tipo: e.tipo, mensaje: e.message }
        : { tipo: 'interno', mensaje: e instanceof Error ? e.message : 'Error desconocido' }
    if (error.tipo === 'sin-conexion' && !navigator.onLine) return { estado: 'sin-conexion' }
    await actualizarEstado({ error: { ...error, en: Date.now() } })
    return { estado: 'error', ...error }
  }
}
