import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  botonPrimario,
  botonSecundario,
  botonTerciario,
  mensajeAviso,
  mensajeNeutro,
  tarjeta,
  textoError,
} from '../componentes/estilos'
import { PanelImpresora } from '../componentes/PanelImpresora'
import { formatear } from '../lib/dominio/dinero'
import { renglonesTicket, type Renglon } from '../lib/dominio/ticket'
import { marcarTicketImpreso } from '../lib/db/caja.repo'
import { useVenta } from '../lib/hooks/useCaja'
import { useImpresora } from '../lib/hooks/impresora'
import { bytesTicket } from '../lib/impresora/escpos'
import { imprimir, leerEstado, mensajeDeError } from '../lib/impresora/impresora'
import { formatearHora } from '../lib/formato'

export default function Ticket() {
  const { id } = useParams()
  const venta = useVenta(id)
  const navegar = useNavigate()
  const { soporte, revisada, elegida, ocupada, ajustes } = useImpresora()
  const [panel, setPanel] = useState<'ajustes' | 'para-imprimir' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (venta === undefined) return null
  if (venta === null) {
    return <p className="p-10 text-center text-barro">No se encontró esta venta.</p>
  }

  const sinSoporte = !soporte.serial && !soporte.ble

  async function imprimirTicket() {
    setError(null)
    // Estado al momento (puede venir justo de conectar la impresora).
    const { elegida, ajustes } = leerEstado()
    if (!elegida) return setPanel('para-imprimir')
    try {
      await imprimir(bytesTicket(renglonesTicket(venta!, ajustes), ajustes))
      await marcarTicketImpreso(venta!.id)
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <div className="mx-auto grid h-full max-w-5xl gap-4 overflow-y-auto p-4 md:grid-cols-2">
      <section className={`${tarjeta} space-y-4 self-start`}>
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

        <button
          type="button"
          onClick={imprimirTicket}
          disabled={sinSoporte || !revisada || ocupada}
          className={`${botonPrimario} flex w-full items-center justify-center gap-2`}
        >
          <IconoImpresora />
          {ocupada ? 'Imprimiendo…' : venta.ticketImpresoEn ? 'Imprimir de nuevo' : 'Imprimir ticket'}
        </button>
        {venta.ticketImpresoEn && (
          <p className="text-center text-xs font-semibold text-salvia-800" data-testid="ticket-impreso">
            Ticket impreso a las {formatearHora(venta.ticketImpresoEn)}
          </p>
        )}
        {error && (
          <p className={textoError} role="alert" data-testid="ticket-error">
            {error}
          </p>
        )}
        {sinSoporte && (
          <p className={mensajeAviso} data-testid="ticket-sin-soporte">
            Este navegador no puede usar impresoras Bluetooth. Abre la app en Google Chrome de la tablet.
          </p>
        )}

        {!sinSoporte && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-barro" data-testid="ticket-impresora">
              Impresora: {elegida ? <span className="text-espresso">{elegida.nombre}</span> : 'sin conectar'}
            </span>
            <button type="button" onClick={() => setPanel('ajustes')} className={botonTerciario}>
              {elegida ? 'Cambiar o probar' : 'Conectar'}
            </button>
          </div>
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

      <section className={`${tarjeta} self-start`}>
        <p className="mb-3 text-sm text-barro">Así saldrá el ticket</p>
        <VistaTicket renglones={renglonesTicket(venta, ajustes)} />
      </section>

      {panel && (
        <PanelImpresora
          onCerrar={() => setPanel(null)}
          aviso={panel === 'para-imprimir' ? 'Conecta la impresora para imprimir el ticket.' : undefined}
          onConectada={
            panel === 'para-imprimir'
              ? () => {
                  setPanel(null)
                  void imprimirTicket()
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

/** El ticket como sale en el papel de 80 mm: mismos renglones, misma letra fija. */
function VistaTicket({ renglones }: { renglones: Renglon[] }) {
  return (
    <div
      className="mx-auto w-fit rounded-md border border-linea bg-white px-4 py-5 font-mono text-[13px] leading-[1.5] text-espresso shadow-sm"
      data-testid="ticket-vista"
    >
      {renglones.map((r, i) => (
        <div
          key={i}
          className={'whitespace-pre' + (r.grande ? ' text-[26px] leading-[1.25]' : '')}
          data-testid="ticket-renglon"
        >
          {r.partes.map((p, j) =>
            p.negrita ? (
              <strong key={j} className="font-bold">
                {p.texto}
              </strong>
            ) : (
              <span key={j}>{p.texto}</span>
            ),
          )}
        </div>
      ))}
    </div>
  )
}

function IconoImpresora() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M7 8V3h10v5" />
      <rect x="3" y="8" width="18" height="9" rx="2" />
      <path d="M7 14h10v7H7z" />
      <path d="M17.5 11h.01" />
    </svg>
  )
}
