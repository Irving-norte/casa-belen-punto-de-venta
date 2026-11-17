import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { TecladoMonto, textoACentavos } from '../componentes/TecladoMonto'
import { botonPrimario, botonSecundario, campoTexto, tarjeta } from '../componentes/estilos'
import type { FormaPago } from '../lib/dominio/tipos'
import { formatear } from '../lib/dominio/dinero'
import { subtotal } from '../lib/dominio/carrito'
import {
  NOMBRE_FORMA,
  estaPagado,
  pendiente,
  quitarPago,
  registrarPago,
  type EstadoCobro,
} from '../lib/dominio/pagos'
import { guardarVenta } from '../lib/db/caja.repo'
import { useVentaEnCurso } from '../lib/hooks/ventaEnCurso'

const FORMAS: FormaPago[] = ['efectivo', 'tarjeta', 'transferencia']
const BILLETES = [50, 100, 200, 500, 1000]

export default function Cobrar() {
  const venta = useVentaEnCurso()
  const navegar = useNavigate()
  const [cobro, setCobro] = useState<EstadoCobro>({ total: venta.total, pagos: [], cambio: 0 })
  const [forma, setForma] = useState<FormaPago>('efectivo')
  const [monto, setMonto] = useState('')
  const [referencia, setReferencia] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [terminada, setTerminada] = useState(false)

  // La navegación al ticket es una transición (baja prioridad) y vaciar el
  // carrito es inmediato: sin esto, el carrito vacío redirigiría a "/"
  // antes de llegar al ticket.
  if (terminada) return null
  // Si el carrito está vacío no hay nada que cobrar aquí.
  if (venta.lineas.length === 0) return <Navigate to="/" replace />
  if (cobro.total !== venta.total) {
    setCobro({ total: venta.total, pagos: [], cambio: 0 })
  }

  const falta = pendiente(cobro)
  const pagado = estaPagado(cobro)

  function agregarPago() {
    const centavos = textoACentavos(monto) ?? falta // vacío = el monto exacto
    try {
      setCobro(registrarPago(cobro, forma, centavos, referencia))
      setMonto('')
      setReferencia('')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el pago')
    }
  }

  async function terminar() {
    setGuardando(true)
    try {
      const guardada = await guardarVenta({
        tipoCliente: venta.tipoCliente,
        lineas: venta.lineas,
        pagos: cobro.pagos,
        cambio: cobro.cambio,
      })
      setTerminada(true)
      navegar(`/venta/${guardada.id}`, { replace: true })
      venta.vaciar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la venta')
      setGuardando(false)
    }
  }

  const atajos =
    forma === 'efectivo'
      ? [
          { texto: 'Exacto', valor: String(falta / 100) },
          ...BILLETES.filter((b) => b * 100 > falta)
            .slice(0, 4)
            .map((b) => ({ texto: formatear(b * 100), valor: String(b) })),
        ]
      : [{ texto: 'Lo que falta', valor: String(falta / 100) }]

  return (
    <div className="mx-auto grid h-full max-w-6xl gap-4 overflow-y-auto p-4 md:grid-cols-[1fr_420px]">
      {/* ---------- Resumen ---------- */}
      <section className={`${tarjeta} flex min-h-0 flex-col`}>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-medium">Cobrar</h1>
          <button type="button" onClick={() => navegar('/')} className="text-sm text-terracota">
            ← Volver a la venta
          </button>
        </div>
        {venta.tipoCliente === 'alumno' && (
          <p className="mb-2 text-sm text-barro">Precios de alumno</p>
        )}
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
          {venta.lineas.map((l) => (
            <li key={`${l.productoId}-${l.variante ?? ''}-${l.precioUnitario}`} className="flex justify-between gap-2">
              <span>
                {l.cantidad} × {l.nombre}
                {l.variante && <span className="text-barro"> · {l.variante}</span>}
              </span>
              <span className="tabular-nums">{formatear(subtotal(l))}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-linea pt-3">
          <Fila etiqueta="Total" valor={formatear(cobro.total)} grande />
          {cobro.pagos.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>
                {NOMBRE_FORMA[p.forma]}
                {p.referencia && <span className="text-barro"> · {p.referencia}</span>}
                <button
                  type="button"
                  onClick={() => setCobro(quitarPago(cobro, i))}
                  className="ml-3 text-xs text-peligro"
                >
                  Quitar
                </button>
              </span>
              <span className="tabular-nums">{formatear(p.monto)}</span>
            </div>
          ))}
          {!pagado && <Fila etiqueta="Falta" valor={formatear(falta)} />}
        </div>
      </section>

      {/* ---------- Pagos ---------- */}
      <section className={tarjeta}>
        {pagado ? (
          <div className="flex h-full flex-col justify-center gap-5 text-center">
            {cobro.cambio > 0 ? (
              <div>
                <p className="text-sm text-barro">Cambio a entregar</p>
                <p className="text-5xl font-medium text-terracota tabular-nums" data-testid="cambio">
                  {formatear(cobro.cambio)}
                </p>
              </div>
            ) : (
              <p className="text-lg">Pago completo</p>
            )}
            <button
              type="button"
              disabled={guardando}
              onClick={terminar}
              className={`${botonPrimario} w-full text-lg`}
            >
              Terminar venta
            </button>
            {error && <p className="text-sm text-peligro">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pago">
              {FORMAS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={forma === f}
                  onClick={() => {
                    setForma(f)
                    setMonto('')
                    setError(null)
                  }}
                  className={
                    'rounded-xl py-3 text-sm ' +
                    (forma === f ? 'bg-espresso font-medium text-vela' : 'border border-linea bg-vela')
                  }
                >
                  {NOMBRE_FORMA[f]}
                </button>
              ))}
            </div>

            <TecladoMonto
              valor={monto}
              onChange={(v) => {
                setMonto(v)
                setError(null)
              }}
              etiqueta={forma === 'efectivo' ? 'Recibido (vacío = exacto)' : 'Monto (vacío = lo que falta)'}
              atajos={atajos}
            />

            {forma !== 'efectivo' && (
              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Referencia o últimos 4 dígitos (opcional)"
                className={campoTexto}
              />
            )}

            {error && <p className="text-sm text-peligro">{error}</p>}

            <button type="button" onClick={agregarPago} className={`${botonPrimario} w-full`}>
              Registrar pago en {NOMBRE_FORMA[forma].toLowerCase()}
            </button>
            {cobro.pagos.length > 0 && (
              <p className="text-center text-xs text-barro">
                Para pago mixto, registra el siguiente pago con otra forma.
              </p>
            )}
            <button type="button" onClick={() => navegar('/')} className={`${botonSecundario} w-full md:hidden`}>
              Volver a la venta
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function Fila({ etiqueta, valor, grande }: { etiqueta: string; valor: string; grande?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={grande ? 'font-medium' : 'text-sm text-barro'}>{etiqueta}</span>
      <span className={(grande ? 'text-2xl font-medium' : 'text-sm') + ' tabular-nums'}>{valor}</span>
    </div>
  )
}
