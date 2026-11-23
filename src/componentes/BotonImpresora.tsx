import { useState } from 'react'
import { IconoImpresora } from './IconoImpresora'
import { PanelImpresora } from './PanelImpresora'
import { useImpresora } from '../lib/hooks/impresora'

/**
 * Acceso a la impresora desde el encabezado, con o sin caja abierta: así se
 * conecta y se prueba en la tablet antes de la primera venta, sin crear nada.
 */
export default function BotonImpresora() {
  const { soporte, revisada, elegida } = useImpresora()
  const [abierto, setAbierto] = useState(false)
  if (!soporte.serial && !soporte.ble) return null

  const tono = !revisada || elegida ? 'bg-manteca text-espresso' : 'bg-ambar-100 text-ambar-800'
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        data-testid="boton-impresora"
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold hover:bg-linea active:bg-linea-fuerte ${tono}`}
      >
        <IconoImpresora className="h-4 w-4" />
        {!revisada || elegida ? 'Impresora' : 'Sin impresora'}
      </button>
      {abierto && <PanelImpresora onCerrar={() => setAbierto(false)} />}
    </>
  )
}
