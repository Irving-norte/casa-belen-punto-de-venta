import type { Caja, Catalogo, Existencias, Gasto, Venta } from '../dominio/tipos'
import type { Entorno } from '../entorno'

/**
 * Lo que se dicen la tablet y el Apps Script de la hoja
 * (apps-script/Codigo.gs). Si cambia la forma, sube la versión en los dos.
 *
 * La tablet manda POST con cuerpo text/plain (JSON): así el navegador no
 * hace la consulta previa de CORS, que Apps Script no contesta.
 */
export const VERSION_PROTOCOLO = 1

/** Lo que se sube de cada registro. Lo del ticket (y el teléfono de ventas viejas) NO sale de la tablet. */
export type VentaParaHoja = Omit<Venta, 'sincronizada' | 'ticketImpresoEn' | 'telefonoCliente' | 'ticketEnviadoEn'>
export type GastoParaHoja = Omit<Gasto, 'sincronizado'>
export type CajaParaHoja = Omit<Caja, 'sincronizada'>

export interface Pendientes {
  ventas: VentaParaHoja[]
  gastos: GastoParaHoja[]
  cajas: CajaParaHoja[]
}

export type Accion = 'estado' | 'sincronizar'

export interface Peticion {
  version: number
  clave: string
  entorno: Entorno
  accion: Accion
  datos?: Pendientes
}

export interface ErrorDeCatalogo {
  pestana: string
  fila: number
  mensaje: string
}

export interface Rechazado {
  tipo: 'venta' | 'gasto' | 'caja'
  id: string
  motivo: string
}

export interface RespuestaOk {
  ok: true
  version: number
  entorno: Entorno
  hoja: string
  // Solo en «sincronizar»:
  generadoEn?: number
  aceptados?: { ventas: string[]; gastos: string[]; cajas: string[] }
  rechazados?: Rechazado[]
  catalogo?: Catalogo & { errores: ErrorDeCatalogo[] }
  existencias?: Existencias
}

/** Errores que reporta el script. */
export type ErrorDelScript = 'clave' | 'entorno' | 'version' | 'sin-preparar' | 'sin-clave' | 'datos' | 'interno'

export interface RespuestaFallo {
  ok: false
  error: ErrorDelScript
  mensaje: string
}

export type Respuesta = RespuestaOk | RespuestaFallo
