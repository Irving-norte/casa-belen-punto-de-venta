import type { Venta } from './tipos'
import { formatear } from './dinero'
import { NOMBRE_FORMA } from './pagos'

const fecha = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Texto plano del ticket, listo para mandar por WhatsApp. */
export function textoTicket(venta: Venta): string {
  const lineas = venta.lineas.map((l) => {
    const nombre = l.variante ? `${l.nombre} (${l.variante})` : l.nombre
    return `${l.cantidad} × ${nombre} — ${formatear(l.precioUnitario)} c/u — ${formatear(l.precioUnitario * l.cantidad)}`
  })

  const pagos = venta.pagos.map((p) => `${NOMBRE_FORMA[p.forma]}: ${formatear(p.monto)}`)
  if (venta.cambio > 0) pagos.push(`Cambio: ${formatear(venta.cambio)}`)

  return [
    'CERERÍA CASA BELÉN',
    `Ticket #${venta.folio} · ${fecha.format(venta.creadaEn)}`,
    ...(venta.tipoCliente === 'alumno' ? ['Cliente: Alumno'] : []),
    '',
    ...lineas,
    '',
    `TOTAL: ${formatear(venta.total)}`,
    ...pagos,
    '',
    '¡Gracias por tu compra!',
  ].join('\n')
}

/** Solo dígitos; a un número de 10 dígitos se le antepone la lada de México. */
export function normalizarTelefono(texto: string): string {
  const digitos = texto.replace(/\D/g, '')
  return digitos.length === 10 ? `52${digitos}` : digitos
}

export function telefonoValido(texto: string): boolean {
  const n = normalizarTelefono(texto)
  return n.length >= 12 && n.length <= 13
}

/**
 * Enlace que abre WhatsApp con el ticket escrito. Sin teléfono, WhatsApp
 * deja elegir el contacto.
 */
export function enlaceWhatsApp(texto: string, telefono?: string): string {
  const numero = telefono ? normalizarTelefono(telefono) : ''
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}
