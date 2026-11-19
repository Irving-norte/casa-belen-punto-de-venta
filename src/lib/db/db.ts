import Dexie, { type EntityTable } from 'dexie'
import type { Caja, Gasto, Venta } from '../dominio/tipos'
import { NOMBRE_BASE_DE_DATOS } from '../entorno'

export interface MetaRegistro {
  clave: string
  valor: unknown
}

/**
 * Base local de la tablet (IndexedDB). Todo se guarda aquí primero; la
 * hoja de Google recibe una copia cuando hay conexión (`sincronizada`).
 */
export class PuntoDeVentaDB extends Dexie {
  cajas!: EntityTable<Caja, 'id'>
  ventas!: EntityTable<Venta, 'id'>
  gastos!: EntityTable<Gasto, 'id'>
  meta!: EntityTable<MetaRegistro, 'clave'>

  constructor() {
    super(NOMBRE_BASE_DE_DATOS)
    this.version(1).stores({
      cajas: 'id, abiertaEn, sincronizada',
      ventas: 'id, folio, cajaId, creadaEn, sincronizada',
      gastos: 'id, cajaId, creadoEn, sincronizado',
      meta: 'clave',
    })
  }
}

export const db = new PuntoDeVentaDB()
