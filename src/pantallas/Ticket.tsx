import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  botonPrimario,
  botonSecundario,
  campoTexto,
  mensajeNeutro,
  tarjeta,
  textoError,
} from '../componentes/estilos'
import { formatear } from '../lib/dominio/dinero'
import { enlaceWhatsApp, telefonoValido, textoTicket } from '../lib/dominio/ticket'
import { marcarTicketEnviado } from '../lib/db/caja.repo'
import { useVenta } from '../lib/hooks/useCaja'
import { formatearHora } from '../lib/formato'

export default function Ticket() {
  const { id } = useParams()
  const venta = useVenta(id)
  const navegar = useNavigate()
  const [telefono, setTelefono] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (venta === undefined) return null
  if (venta === null) {
    return <p className="p-10 text-center text-barro">No se encontró esta venta.</p>
  }

  const texto = textoTicket(venta)
  const tel = telefono ?? venta.telefonoCliente ?? ''

  async function enviar() {
    if (tel && !telefonoValido(tel)) return setError('El teléfono debe tener 10 dígitos')
    if (!navigator.onLine) {
      return setError('Sin internet. La venta ya está guardada; envía el ticket desde "Ventas del día" cuando vuelva la conexión.')
    }
    window.open(enlaceWhatsApp(texto, tel || undefined), '_blank', 'noopener')
    await marcarTicketEnviado(venta!.id, tel || undefined)
  }

  return (
    <div className="mx-auto grid h-full max-w-5xl gap-4 overflow-y-auto p-4 md:grid-cols-2">
      <section className={`${tarjeta} space-y-4`}>
        <div>
          <p className="text-sm text-barro" data-testid="ticket-folio">
            Venta #{venta.folio} · {formatearHora(venta.creadaEn)}
          </p>
          <p className="text-3xl font-semibold tabular-nums" data-testid="ticket-total">
            {formatear(venta.total)}
          </p>
        </div>

        {venta.cambio > 0 && (
          <p className={mensajeNeutro}>
            Cambio entregado: <strong>{formatear(venta.cambio)}</strong>
          </p>
        )}

        <div className="space-y-2">
          <label htmlFor="telefono" className="text-sm font-semibold">
            WhatsApp del cliente
          </label>
          <input
            id="telefono"
            type="tel"
            inputMode="numeric"
            value={tel}
            onChange={(e) => {
              setTelefono(e.target.value)
              setError(null)
            }}
            placeholder="10 dígitos (opcional)"
            className={campoTexto}
          />
          <p className="text-xs text-barro">Sin número, WhatsApp te deja elegir el contacto.</p>
        </div>

        {error && <p className={textoError} role="alert">{error}</p>}

        <button type="button" onClick={enviar} className={`${botonPrimario} w-full`}>
          {venta.ticketEnviadoEn ? 'Reenviar ticket por WhatsApp' : 'Enviar ticket por WhatsApp'}
        </button>
        {venta.ticketEnviadoEn && (
          <p className="text-center text-xs font-semibold text-salvia-800" data-testid="ticket-enviado">Ticket enviado a las {formatearHora(venta.ticketEnviadoEn)}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => navegar('/ventas')} className={botonSecundario}>
            Ventas del día
          </button>
          <button type="button" onClick={() => navegar('/')} className={botonSecundario}>
            Nueva venta
          </button>
        </div>
      </section>

      <section className={tarjeta}>
        <p className="mb-2 text-sm text-barro">Así se verá el ticket</p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed" data-testid="ticket-texto">{texto}</pre>
      </section>
    </div>
  )
}
