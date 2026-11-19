import { ENTORNO, ES_QA } from '../entorno'
import {
  VERSION_PROTOCOLO,
  type Accion,
  type ErrorDelScript,
  type Pendientes,
  type Peticion,
  type Respuesta,
  type RespuestaOk,
} from './protocolo'

export interface ConexionHoja {
  /** URL de la aplicación web del Apps Script (termina en /exec). */
  url: string
  clave: string
}

export type TipoErrorHoja = ErrorDelScript | 'sin-conexion' | 'tiempo' | 'respuesta'

export class ErrorDeHoja extends Error {
  constructor(
    readonly tipo: TipoErrorHoja,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ErrorDeHoja'
  }
}

const URL_SCRIPT = /^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[\w-]+\/exec$/
// Solo en QA: la hoja simulada de las pruebas corre en la misma computadora.
const URL_LOCAL = /^http:\/\/(127\.0\.0\.1|localhost):\d+\/[\w/-]*exec$/

/** La URL debe ser de una aplicación web de Apps Script. */
export function urlDeHojaValida(url: string): boolean {
  return URL_SCRIPT.test(url) || (ES_QA && URL_LOCAL.test(url))
}

const ESPERA_MAXIMA_MS = 45_000

/**
 * Llama al Apps Script de la hoja. Lanza ErrorDeHoja con un mensaje para el
 * vendedor si no hay conexión, la hoja rechaza la petición o contesta algo
 * que no es lo esperado.
 */
export async function llamarHoja(conexion: ConexionHoja, accion: Accion, datos?: Pendientes): Promise<RespuestaOk> {
  if (!urlDeHojaValida(conexion.url)) {
    throw new ErrorDeHoja('respuesta', 'La dirección de la hoja no es válida: vuelve a vincular la tablet')
  }
  const peticion: Peticion = {
    version: VERSION_PROTOCOLO,
    clave: conexion.clave,
    entorno: ENTORNO,
    accion,
    ...(datos ? { datos } : {}),
  }

  const cancelar = new AbortController()
  const temporizador = setTimeout(() => cancelar.abort(), ESPERA_MAXIMA_MS)
  let respuesta: Response
  try {
    respuesta = await fetch(conexion.url, {
      method: 'POST',
      // text/plain evita la consulta previa de CORS (Apps Script no la contesta).
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(peticion),
      redirect: 'follow',
      cache: 'no-store',
      signal: cancelar.signal,
    })
  } catch (e) {
    if (cancelar.signal.aborted) throw new ErrorDeHoja('tiempo', 'La hoja tardó demasiado en contestar')
    throw new ErrorDeHoja('sin-conexion', 'No se pudo conectar con la hoja')
  } finally {
    clearTimeout(temporizador)
  }

  if (!respuesta.ok) {
    throw new ErrorDeHoja('respuesta', `La hoja contestó con un error (HTTP ${respuesta.status})`)
  }
  let cuerpo: Respuesta
  try {
    cuerpo = (await respuesta.json()) as Respuesta
  } catch {
    throw new ErrorDeHoja(
      'respuesta',
      'La hoja no contestó como se esperaba. ¿El script está publicado como aplicación web con acceso para «Cualquier usuario»?',
    )
  }
  if (!cuerpo || typeof cuerpo !== 'object' || typeof cuerpo.ok !== 'boolean') {
    throw new ErrorDeHoja('respuesta', 'La hoja no contestó como se esperaba')
  }
  if (!cuerpo.ok) throw new ErrorDeHoja(cuerpo.error, cuerpo.mensaje)
  if (cuerpo.version !== VERSION_PROTOCOLO) {
    throw new ErrorDeHoja('version', 'La app y la hoja usan versiones distintas: actualiza el script de la hoja')
  }
  // El script ya lo revisa; se repite aquí por si la hoja es de otra versión.
  if (cuerpo.entorno !== ENTORNO) {
    throw new ErrorDeHoja(
      'entorno',
      ES_QA ? 'Esa es la hoja real de la tienda: la app de QA no puede usarla' : 'Esa es la hoja de PRUEBAS: la tablet de la tienda no puede usarla',
    )
  }
  return cuerpo
}
