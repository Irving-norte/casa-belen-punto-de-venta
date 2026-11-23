import type { FormaPago, Venta } from './tipos'
import { textoImprimible } from '../impresora/caracteres'

/**
 * El ticket impreso, en papel térmico de 80 mm.
 *
 * Se arma en renglones de ancho fijo: 48 letras con la letra normal de una
 * impresora de 80 mm (algunos modelos usan 42). Los centrados y los importes
 * a la derecha se hacen con espacios, así la vista previa en pantalla y el
 * papel salen iguales en cualquier impresora. Nada se corta: los nombres
 * largos pasan al renglón siguiente y los importes no se mueven.
 */

export const NEGOCIO = 'CERERÍA CASA BELÉN'

export interface OpcionesTicket {
  /** Letras por renglón con la letra normal: 48 (lo común en 80 mm) o 42. */
  columnas: number
  /** false = solo letras básicas, para impresoras sin acentos. */
  acentos: boolean
}

export const TICKET_80MM: OpcionesTicket = { columnas: 48, acentos: true }

export interface Parte {
  texto: string
  negrita?: boolean
}

export interface Renglon {
  partes: Parte[]
  /** Doble de alto y de ancho: caben la mitad de letras. */
  grande?: boolean
}

const dinero = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Siempre con centavos: 1900 → «$19.00». */
export function dineroTicket(centavos: number): string {
  return dinero.format(centavos / 100)
}

const dos = (n: number) => String(n).padStart(2, '0')

/** 23/11/2026 */
export function fechaTicket(ms: number): string {
  const f = new Date(ms)
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()}`
}

/** 10:42 a.m. · 1:05 p.m. */
export function horaTicket(ms: number): string {
  const f = new Date(ms)
  const h = f.getHours()
  return `${h % 12 || 12}:${dos(f.getMinutes())} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

/** Etiqueta de cada forma de pago en el ticket. */
const ETIQUETA_PAGO: Record<FormaPago, string> = {
  efectivo: 'Efectivo recibido',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

export function renglonesTicket(venta: Venta, opciones: OpcionesTicket = TICKET_80MM): Renglon[] {
  const { columnas } = opciones
  const t = (texto: string) => textoImprimible(texto, opciones.acentos)
  const raya: Renglon = { partes: [{ texto: '-'.repeat(columnas) }] }
  const renglones: Renglon[] = []

  // Encabezado
  renglones.push(
    { partes: [{ texto: centrar(t(NEGOCIO), columnas / 2), negrita: true }], grande: true },
    { partes: [{ texto: centrar(t('VELAS ARTESANALES · CERERÍA'), columnas) }] },
    { partes: [{ texto: centrar(t('Gracias por preferirnos'), columnas) }] },
    raya,
    aLosLados({ texto: `TICKET #${String(venta.folio).padStart(3, '0')}`, negrita: true }, { texto: fechaTicket(venta.creadaEn) }, columnas),
    { partes: [{ texto: horaTicket(venta.creadaEn) }] },
  )
  if (venta.tipoCliente === 'alumno') renglones.push({ partes: [{ texto: 'Cliente: Alumno' }] })
  renglones.push(raya, { partes: [{ texto: t('CANT. DESCRIPCIÓN') }] })

  // Productos, en el orden en que se agregaron
  for (const linea of venta.lineas) {
    const nombre = linea.variante ? `${linea.nombre} (${linea.variante})` : linea.nombre
    const prefijo = t(`${linea.cantidad} × `)
    const importe = dineroTicket(linea.precioUnitario * linea.cantidad)
    const [primero = '', ...resto] = ajustar(prefijo + t(nombre), columnas - importe.length - 1, prefijo.length)
    renglones.push(aLosLados({ texto: primero, negrita: true }, { texto: importe, negrita: true }, columnas))
    for (const r of resto) renglones.push({ partes: [{ texto: r, negrita: true }] })
    renglones.push({ partes: [{ texto: t(`${linea.cantidad} × ${dineroTicket(linea.precioUnitario)} c/u`) }] })
  }

  // Total y pagos
  renglones.push(
    raya,
    { ...aLosLados({ texto: 'TOTAL', negrita: true }, { texto: dineroTicket(venta.total), negrita: true }, columnas / 2), grande: true },
    raya,
  )
  for (const [forma, monto] of pagosPorForma(venta)) {
    renglones.push(aLosLados({ texto: ETIQUETA_PAGO[forma] }, { texto: dineroTicket(monto) }, columnas))
  }
  if (venta.pagos.some((p) => p.forma === 'efectivo')) {
    renglones.push(aLosLados({ texto: 'Cambio', negrita: true }, { texto: dineroTicket(venta.cambio), negrita: true }, columnas))
  }

  // Pie
  renglones.push(
    raya,
    { partes: [{ texto: centrar(t('¡GRACIAS POR TU COMPRA!'), columnas), negrita: true }] },
    { partes: [{ texto: centrar('Esperamos verte pronto', columnas) }] },
    { partes: [{ texto: centrar(t(NEGOCIO), columnas) }] },
  )
  return renglones
}

/**
 * Ticket de prueba (no es una venta): sirve para revisar en la tablet de la
 * tienda que la impresora responde, que los acentos salen bien y que la
 * regla de números cabe en un solo renglón.
 */
export function renglonesPrueba(opciones: OpcionesTicket = TICKET_80MM): Renglon[] {
  const { columnas } = opciones
  const t = (texto: string) => textoImprimible(texto, opciones.acentos)
  const raya: Renglon = { partes: [{ texto: '-'.repeat(columnas) }] }
  const regla = Array.from({ length: columnas }, (_, i) => String((i + 1) % 10)).join('')
  return [
    { partes: [{ texto: centrar(t(NEGOCIO), columnas / 2), negrita: true }], grande: true },
    { partes: [{ texto: centrar(t('PRUEBA DE IMPRESIÓN'), columnas), negrita: true }] },
    raya,
    { partes: [{ texto: t('Acentos: á é í ó ú ñ ü ¡! ¿?') }] },
    { partes: [{ texto: t('Mayúsculas: Á É Í Ó Ú Ñ') }] },
    { partes: [{ texto: t('Medidas: ½ kg · ¼ L · 5 × $19.00') }] },
    raya,
    { partes: [{ texto: `Regla de ${columnas} letras:` }] },
    { partes: [{ texto: regla }] },
    raya,
    { ...aLosLados({ texto: 'TOTAL', negrita: true }, { texto: dineroTicket(84700), negrita: true }, columnas / 2), grande: true },
    raya,
    ...ajustar(t('Si los acentos salen como símbolos, elige «Sin acentos».'), columnas, 0).map((texto) => ({ partes: [{ texto }] })),
    ...ajustar(t(`Si la regla no cabe en un renglón, elige 42 letras.`), columnas, 0).map((texto) => ({ partes: [{ texto }] })),
  ]
}

/** El texto de un renglón, como sale en papel. */
export function textoRenglon(renglon: Renglon): string {
  return renglon.partes.map((p) => p.texto).join('')
}

// ---------------------------------------------------------------------------

/** Efectivo recibido incluye el cambio que se regresó. */
function pagosPorForma(venta: Venta): [FormaPago, number][] {
  const suma = new Map<FormaPago, number>()
  for (const p of venta.pagos) suma.set(p.forma, (suma.get(p.forma) ?? 0) + p.monto)
  if (suma.has('efectivo')) suma.set('efectivo', suma.get('efectivo')! + venta.cambio)
  return [...suma]
}

function centrar(texto: string, ancho: number): string {
  return ' '.repeat(Math.max(0, Math.floor((ancho - texto.length) / 2))) + texto
}

/** Texto a la izquierda e importe a la derecha, con al menos un espacio. */
function aLosLados(izquierda: Parte, derecha: Parte, ancho: number): Renglon {
  const espacio = Math.max(1, ancho - izquierda.texto.length - derecha.texto.length)
  return { partes: [izquierda, { texto: ' '.repeat(espacio) }, derecha] }
}

/**
 * Parte un texto en renglones de `ancho` letras, por palabras. Los renglones
 * que siguen llevan `sangria` espacios (para alinear bajo el nombre). Una
 * palabra más larga que el renglón se parte, nunca se corta.
 */
export function ajustar(texto: string, ancho: number, sangria: number): string[] {
  sangria = Math.min(sangria, ancho - 1)
  const renglones: string[] = []
  let actual = ''
  const inicio = () => (renglones.length ? ' '.repeat(sangria) : '')
  for (const palabra of texto.split(' ').filter(Boolean)) {
    const base = actual || inicio()
    const junto = actual ? `${actual} ${palabra}` : base + palabra
    if (junto.length <= ancho) {
      actual = junto
      continue
    }
    if (actual) renglones.push(actual)
    actual = inicio() + palabra
    while (actual.length > ancho) {
      renglones.push(actual.slice(0, ancho))
      actual = ' '.repeat(sangria) + actual.slice(ancho)
    }
  }
  if (actual) renglones.push(actual)
  return renglones
}
