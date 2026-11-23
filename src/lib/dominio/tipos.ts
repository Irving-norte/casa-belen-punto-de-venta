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
  /**
   * Existencia de la que sale. Vacío = el producto lleva la suya (por pieza).
   * Ej.: «Soya APF 1 kg» y «Soya APF ½ kg» salen del artículo «Soya APF».
   */
  articulo?: string
  /** Cuánto resta cada pieza vendida de esa existencia (p. ej. 1000 g). Vacío = 1. */
  descuenta?: number
}

export interface Catalogo {
  categorias: Categoria[]
  productos: Producto[]
}

/**
 * Existencias según la hoja, por clave (ver dominio/existencias.ts):
 * cantidad en piezas o en la unidad del artículo (g para las ceras).
 */
export type Existencias = Record<string, { cantidad: number; unidad: string }>

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
  /** Última vez que se imprimió su ticket (solo en la tablet; no va a la hoja). */
  ticketImpresoEn?: number
  /**
   * Solo en ventas de cuando el ticket se mandaba por WhatsApp. Ya no se
   * llenan; se siguen quitando al subir para que el teléfono nunca salga.
   */
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
