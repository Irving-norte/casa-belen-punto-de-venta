import { useState } from 'react'
import { Modal } from './Modal'
import {
  botonPrimario,
  botonSecundario,
  botonTerciario,
  mensajeAviso,
  mensajeError,
  mensajeExito,
  mensajeNeutro,
  opcion,
} from './estilos'
import { useImpresora } from '../lib/hooks/impresora'
import {
  cambiarAjustes,
  elegirImpresora,
  imprimir,
  mensajeDeError,
  olvidarImpresora,
  type TipoConexion,
} from '../lib/impresora/impresora'
import { bytesTicket } from '../lib/impresora/escpos'
import { renglonesPrueba } from '../lib/dominio/ticket'

/**
 * Elegir la impresora, imprimir una prueba y ajustar el ancho y los acentos.
 * La prueba no es una venta: se puede usar en la tablet de la tienda.
 */
export function PanelImpresora({
  onCerrar,
  onConectada,
  aviso,
}: {
  onCerrar: () => void
  /** Se llama al elegir una impresora (p. ej. para imprimir enseguida). */
  onConectada?: () => void
  aviso?: string
}) {
  const { soporte, elegida, ocupada, ajustes } = useImpresora()
  const [mensaje, setMensaje] = useState<{ tono: 'exito' | 'error'; texto: string } | null>(null)
  const sinSoporte = !soporte.serial && !soporte.ble

  async function elegir(tipo: TipoConexion) {
    setMensaje(null)
    try {
      await elegirImpresora(tipo)
      onConectada?.()
    } catch (e) {
      setMensaje({ tono: 'error', texto: mensajeDeError(e) })
    }
  }

  async function prueba() {
    setMensaje(null)
    try {
      await imprimir(bytesTicket(renglonesPrueba(ajustes), ajustes))
      setMensaje({ tono: 'exito', texto: 'Prueba enviada. Revisa los acentos y que la regla quepa en un renglón.' })
    } catch (e) {
      setMensaje({ tono: 'error', texto: mensajeDeError(e) })
    }
  }

  async function olvidar() {
    setMensaje(null)
    await olvidarImpresora()
  }

  return (
    <Modal titulo="Impresora de tickets" onCerrar={onCerrar} ancho="max-w-lg">
      <div className="space-y-4">
        {aviso && <p className={mensajeNeutro}>{aviso}</p>}

        {sinSoporte ? (
          <p className={mensajeAviso} data-testid="impresora-sin-soporte">
            Este navegador no puede usar impresoras Bluetooth. Abre la app en Google Chrome de la tablet.
          </p>
        ) : elegida ? (
          <p className={mensajeExito} data-testid="impresora-elegida">
            Lista para imprimir: <strong>{elegida.nombre}</strong>
            {elegida.tipo === 'ble' && ' (Bluetooth LE)'}
          </p>
        ) : (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm" data-testid="impresora-pasos">
            <li>Enciende la impresora y ponle papel.</li>
            <li>
              Solo la primera vez: emparéjala en <strong>Ajustes › Bluetooth</strong> de la tablet. Si pide clave,
              suele ser 0000 o 1234.
            </li>
            <li>
              Toca <strong>Buscar impresora</strong> y elígela de la lista.
            </li>
          </ol>
        )}

        {!sinSoporte && (
          <div className="space-y-2">
            {soporte.serial && (
              <button
                type="button"
                onClick={() => elegir('serial')}
                disabled={ocupada}
                className={`${elegida ? botonSecundario : botonPrimario} w-full`}
              >
                {elegida ? 'Cambiar impresora' : 'Buscar impresora'}
              </button>
            )}
            {soporte.ble && (
              <button
                type="button"
                onClick={() => elegir('ble')}
                disabled={ocupada}
                className={soporte.serial ? `${botonTerciario} w-full` : `${elegida ? botonSecundario : botonPrimario} w-full`}
              >
                {soporte.serial ? '¿No aparece? Buscar por Bluetooth LE' : elegida ? 'Cambiar impresora' : 'Buscar impresora'}
              </button>
            )}
            {soporte.ble && !soporte.serial && (
              <p className="text-xs text-barro">
                Así solo se ven impresoras Bluetooth LE. Para las demás, instala la app desde Google Chrome.
              </p>
            )}
            {elegida?.tipo === 'ble' && (
              <p className="text-xs text-barro">
                Las impresoras Bluetooth LE se vuelven a elegir cada vez que se abre la app.
              </p>
            )}
          </div>
        )}

        {elegida && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={prueba} disabled={ocupada} className={botonSecundario}>
              {ocupada ? 'Imprimiendo…' : 'Imprimir prueba'}
            </button>
            <button type="button" onClick={olvidar} disabled={ocupada} className={botonTerciario}>
              Olvidar impresora
            </button>
          </div>
        )}

        {mensaje && (
          <p
            className={mensaje.tono === 'exito' ? mensajeExito : mensajeError}
            role={mensaje.tono === 'error' ? 'alert' : 'status'}
            data-testid="impresora-mensaje"
          >
            {mensaje.texto}
          </p>
        )}

        <fieldset className="space-y-3 border-t border-linea pt-4">
          <legend className="sr-only">Ajustes de impresión</legend>
          <p className="text-sm font-semibold">Ajustes de impresión</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Ancho del ticket">
            {([48, 42] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={ajustes.columnas === c}
                onClick={() => cambiarAjustes({ columnas: c })}
                className={'rounded-xl py-2.5 text-sm ' + opcion(ajustes.columnas === c)}
              >
                {c === 48 ? '48 letras (normal)' : '42 letras'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Acentos">
            {[true, false].map((a) => (
              <button
                key={String(a)}
                type="button"
                role="radio"
                aria-checked={ajustes.acentos === a}
                onClick={() => cambiarAjustes({ acentos: a })}
                className={'rounded-xl py-2.5 text-sm ' + opcion(ajustes.acentos === a)}
              >
                {a ? 'Con acentos' : 'Sin acentos'}
              </button>
            ))}
          </div>
          <p className="text-xs text-barro">Cámbialos solo si la prueba sale mal.</p>
        </fieldset>
      </div>
    </Modal>
  )
}
