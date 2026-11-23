import { db } from './db'
import type { Caja, Catalogo, Existencias, Gasto, Venta } from '../dominio/tipos'
import type {
  CajaParaHoja,
  ErrorDeCatalogo,
  GastoParaHoja,
  Pendientes,
  Rechazado,
  RespuestaOk,
  VentaParaHoja,
} from '../sincronizacion/protocolo'
import { validarCatalogo, validarExistencias } from '../sincronizacion/validar'

/**
 * Lo que la tablet guarda de la hoja de inventario (tabla `meta`):
 * con qué hoja está vinculada, el último catálogo y existencias recibidos,
 * y cómo le fue en la última sincronización.
 */

export const CLAVES_HOJA = {
  vinculacion: 'hoja:vinculacion',
  catalogo: 'hoja:catalogo',
  existencias: 'hoja:existencias',
  estado: 'hoja:estado',
} as const

export interface Vinculacion {
  url: string
  clave: string
  /** Nombre del archivo de Google Sheets. */
  hoja: string
  vinculadaEn: number
}

export interface CatalogoDeHoja {
  catalogo: Catalogo
  errores: ErrorDeCatalogo[]
  /** Productos que la tablet descartó por venir mal formados. */
  descartados: number
  generadoEn: number
}

export interface ExistenciasDeHoja {
  existencias: Existencias
  generadoEn: number
}

export interface EstadoSincronizacion {
  ultimoIntento?: number
  ultimoExito?: number
  error?: { tipo: string; mensaje: string; en: number }
  rechazados: Rechazado[]
}

async function leer<T>(clave: string): Promise<T | undefined> {
  return (await db.meta.get(clave))?.valor as T | undefined
}

export const leerVinculacion = () => leer<Vinculacion>(CLAVES_HOJA.vinculacion)
export const leerCatalogoDeHoja = () => leer<CatalogoDeHoja>(CLAVES_HOJA.catalogo)
export const leerExistenciasDeHoja = () => leer<ExistenciasDeHoja>(CLAVES_HOJA.existencias)
export const leerEstado = async (): Promise<EstadoSincronizacion> =>
  (await leer<EstadoSincronizacion>(CLAVES_HOJA.estado)) ?? { rechazados: [] }

export async function guardarVinculacion(v: Vinculacion): Promise<void> {
  const anterior = await leerVinculacion()
  await db.transaction('rw', db.meta, async () => {
    await db.meta.put({ clave: CLAVES_HOJA.vinculacion, valor: v })
    // Las existencias y el estado son de la hoja anterior.
    if (anterior && anterior.url !== v.url) {
      await db.meta.bulkDelete([CLAVES_HOJA.existencias, CLAVES_HOJA.estado])
    }
  })
}

/** Deja de sincronizar. Lo pendiente se queda en la tablet; el catálogo también. */
export async function desvincular(): Promise<void> {
  await db.meta.bulkDelete([CLAVES_HOJA.vinculacion, CLAVES_HOJA.existencias, CLAVES_HOJA.estado])
}

export async function actualizarEstado(cambio: Partial<EstadoSincronizacion>): Promise<void> {
  const actual = await leerEstado()
  const nuevo: EstadoSincronizacion = { ...actual, ...cambio }
  if ('error' in cambio && cambio.error === undefined) delete nuevo.error
  await db.meta.put({ clave: CLAVES_HOJA.estado, valor: nuevo })
}

// ---------------------------------------------------------------------------
// Pendientes de subir
// ---------------------------------------------------------------------------

function ventaParaHoja(v: Venta): VentaParaHoja {
  // Lo del ticket se queda en la tablet (y el teléfono de ventas viejas, nunca sale).
  const { sincronizada: _s, ticketImpresoEn: _i, telefonoCliente: _t, ticketEnviadoEn: _e, ...resto } = v
  return resto
}

function gastoParaHoja(g: Gasto): GastoParaHoja {
  const { sincronizado: _s, ...resto } = g
  return resto
}

function cajaParaHoja(c: Caja): CajaParaHoja {
  const { sincronizada: _s, ...resto } = c
  return resto
}

/** Una caja solo se sube cuando ya tiene corte. */
const cajaLista = (c: Caja) => c.cerradaEn != null && !!c.corte

export async function contarPendientes(): Promise<{ ventas: number; gastos: number; cajas: number; total: number }> {
  const [ventas, gastos, cajas] = await Promise.all([
    db.ventas.where('sincronizada').equals(0).count(),
    db.gastos.where('sincronizado').equals(0).count(),
    db.cajas.where('sincronizada').equals(0).filter(cajaLista).count(),
  ])
  return { ventas, gastos, cajas, total: ventas + gastos + cajas }
}

export async function ventasSinSubir(): Promise<Venta[]> {
  return db.ventas.where('sincronizada').equals(0).toArray()
}

/**
 * Lo siguiente por subir: hasta `maxVentas` ventas (las más viejas primero),
 * todos los gastos y todas las cajas cerradas. `excluir` deja fuera lo que la
 * hoja ya rechazó en esta misma sincronización.
 */
export async function tomarPendientes(
  maxVentas: number,
  excluir: ReadonlySet<string>,
): Promise<{ datos: Pendientes; hayMasVentas: boolean }> {
  const fuera = <T extends { id: string }>(x: T) => !excluir.has(x.id)
  const [ventas, gastos, cajas] = await Promise.all([
    db.ventas.where('sincronizada').equals(0).sortBy('creadaEn'),
    db.gastos.where('sincronizado').equals(0).sortBy('creadoEn'),
    db.cajas.where('sincronizada').equals(0).filter(cajaLista).sortBy('abiertaEn'),
  ])
  const porSubir = ventas.filter(fuera)
  return {
    datos: {
      ventas: porSubir.slice(0, maxVentas).map(ventaParaHoja),
      gastos: gastos.filter(fuera).map(gastoParaHoja),
      cajas: cajas.filter(fuera).map(cajaParaHoja),
    },
    hayMasVentas: porSubir.length > maxVentas,
  }
}

/**
 * Marca como subido lo que la hoja aceptó y guarda el catálogo y las
 * existencias que mandó, en una sola transacción: así las existencias nunca
 * cuentan dos veces una venta (en la hoja y como pendiente).
 */
export async function aplicarRespuesta(r: RespuestaOk): Promise<void> {
  const catalogo = r.catalogo ? validarCatalogo(r.catalogo) : null
  const existencias = r.existencias ? validarExistencias(r.existencias) : null
  const generadoEn = r.generadoEn ?? Date.now()

  await db.transaction('rw', [db.ventas, db.gastos, db.cajas, db.meta], async () => {
    if (r.aceptados) {
      await db.ventas.where('id').anyOf(r.aceptados.ventas).modify({ sincronizada: 1 })
      await db.gastos.where('id').anyOf(r.aceptados.gastos).modify({ sincronizado: 1 })
      await db.cajas.where('id').anyOf(r.aceptados.cajas).filter(cajaLista).modify({ sincronizada: 1 })
    }
    if (catalogo) {
      const valor: CatalogoDeHoja = { ...catalogo, generadoEn }
      await db.meta.put({ clave: CLAVES_HOJA.catalogo, valor })
    }
    if (existencias) {
      const valor: ExistenciasDeHoja = { existencias, generadoEn }
      await db.meta.put({ clave: CLAVES_HOJA.existencias, valor })
    }
  })
}
