const hora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' })
const fechaHora = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatearHora = (ms: number) => hora.format(ms)
export const formatearFechaHora = (ms: number) => fechaHora.format(ms)

/** Para buscar sin importar acentos ni mayúsculas. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}
