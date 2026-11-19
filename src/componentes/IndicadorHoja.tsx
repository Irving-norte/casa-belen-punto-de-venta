import { Link } from 'react-router-dom'
import { useSincronizacion } from '../lib/hooks/sincronizacion'

/**
 * Estado de la hoja en el encabezado. Siempre con texto (nunca solo color)
 * y siempre lleva a la pantalla de Sincronización.
 */
export default function IndicadorHoja() {
  const { vinculacion, pendientes, estado, sincronizando, enLinea } = useSincronizacion()
  if (vinculacion === undefined) return null

  const porSubir = pendientes.total > 0 ? `${pendientes.total} por subir` : ''
  let texto: string
  let tono: 'neutro' | 'aviso' | 'error' | 'exito'

  if (!enLinea) {
    texto = ['Sin internet', porSubir || 'se guarda en la tablet'].join(' · ')
    tono = 'aviso'
  } else if (!vinculacion) {
    texto = 'Hoja sin vincular'
    tono = 'neutro'
  } else if (sincronizando) {
    texto = 'Sincronizando…'
    tono = 'neutro'
  } else if (estado.error) {
    texto = ['Error con la hoja', porSubir].filter(Boolean).join(' · ')
    tono = 'error'
  } else if (porSubir) {
    texto = porSubir
    tono = 'aviso'
  } else {
    texto = 'Hoja al día'
    tono = 'exito'
  }

  const colores = {
    neutro: 'bg-manteca text-espresso hover:bg-linea',
    aviso: 'bg-ambar-100 text-ambar-800 hover:bg-linea',
    error: 'bg-peligro-50 text-peligro-700 hover:bg-linea',
    exito: 'bg-salvia-100 text-salvia-800 hover:bg-linea',
  }[tono]

  return (
    <Link
      to="/sincronizacion"
      data-testid="estado-hoja"
      data-tono={tono}
      className={`rounded-full px-3 py-1 font-semibold active:bg-linea-fuerte ${colores}`}
    >
      {texto}
    </Link>
  )
}
