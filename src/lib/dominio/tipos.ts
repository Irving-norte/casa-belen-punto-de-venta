// Todo el dinero va en ENTEROS de centavos (ver dinero.ts).

export type TipoCliente = 'general' | 'alumno'
export type FormaPago = 'efectivo' | 'tarjeta' | 'transferencia'

// ---------- Catálogo ----------

export interface Categoria {
  id: string
  nombre: string
}

/**
 * Cómo se resuelve el precio de un producto. Exactamente uno de tres:
 *  - fijo:     mismo precio para General y Alumno.
 *  - tarifas:  precio distinto para General y Alumno.
 *  - variable: el vendedor lo captura al vender; fuera de [mínimo, máximo]
 *              la app pide confirmar (no bloquea).
 */
export type Precio =
  | { tipo: 'fijo'; centavos: number }
  | { tipo: 'tarifas'; general: number; alumno: number }
  | { tipo: 'variable'; minimo: number; maximo: number }

export interface Producto {
  id: string
  categoriaId: string
  nombre: string
  precio: Precio
  /** Si existe, al vender se elige una (p. ej. el color de un pigmento). */
  variantes?: string[]
}

// ---------- Venta ----------

export interface LineaVenta {
  productoId: string
  nombre: string // congelado al vender
  categoriaId: string
  variante?: string
  cantidad: number // entero ≥ 1
  precioUnitario: number // centavos, congelado al agregar la línea
  /** true si el precio lo capturó el vendedor (producto variable). */
  precioCapturado: boolean
  /** true si se confirmó un precio fuera del rango del producto. */
  fueraDeRango?: boolean
}

export interface Pago {
  forma: FormaPago
  /** Lo que este pago abona a la venta (sin incluir el cambio). */
  monto: number
  referencia?: string
}

export interface Venta {
  id: string
  folio: number
  cajaId: string
  creadaEn: number
  tipoCliente: TipoCliente
  lineas: LineaVenta[]
  total: number
  pagos: Pago[]
  /** Efectivo que entregó el cliente de más y se le regresó. */
  cambio: number
  telefonoCliente?: string
  ticketEnviadoEn?: number
  sincronizada: 0 | 1
}

// ---------- Caja ----------

export interface Gasto {
  id: string
  cajaId: string
  creadoEn: number
  concepto: string
  monto: number
  nota?: string
  sincronizado: 0 | 1
}

export interface Corte {
  numeroVentas: number
  ventasEfectivo: number
  ventasTarjeta: number
  ventasTransferencia: number
  totalVentas: number
  gastos: number
  efectivoEsperado: number
  efectivoContado: number
  /** contado − esperado: positivo = sobrante, negativo = faltante. */
  diferencia: number
}

export interface Caja {
  id: string
  abiertaEn: number
  fondoInicial: number
  cerradaEn?: number
  corte?: Corte
  sincronizada: 0 | 1
}
