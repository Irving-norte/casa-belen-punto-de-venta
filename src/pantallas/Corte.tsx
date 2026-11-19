import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../componentes/Modal'
import { TecladoMonto, textoACentavos } from '../componentes/TecladoMonto'
import {
  botonPrimario,
  botonSecundario,
  mensajeAviso,
  mensajeError,
  mensajeExito,
  tarjeta,
  textoError,
} from '../componentes/estilos'
import type { Caja, Corte as DatosCorte } from '../lib/dominio/tipos'
import { formatear } from '../lib/dominio/dinero'
import { calcularCorte } from '../lib/dominio/corte'
import { cerrarCaja } from '../lib/db/caja.repo'
import { useGastosDeCaja, useVentasDeCaja } from '../lib/hooks/useCaja'
import { useVentaEnCurso } from '../lib/hooks/ventaEnCurso'

export default function Corte({ caja }: { caja: Caja }) {
  const ventas = useVentasDeCaja(caja.id)
  const gastos = useGastosDeCaja(caja.id)
  const ventaEnCurso = useVentaEnCurso()
  const navegar = useNavigate()
  const [contado, setContado] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!ventas || !gastos) return null

  const centavosContados = textoACentavos(contado)
  const corte = calcularCorte(caja, ventas, gastos, centavosContados ?? 0)

  async function cerrar() {
    try {
      await cerrarCaja(centavosContados ?? 0)
      navegar('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la caja')
      setConfirmando(false)
    }
  }

  return (
    <div className="mx-auto grid h-full max-w-5xl gap-4 overflow-y-auto p-4 md:grid-cols-2">
      <section className={tarjeta}>
        <h1 className="mb-4 text-lg font-semibold">Corte de caja</h1>
        <ResumenCorte fondoInicial={caja.fondoInicial} corte={corte} />
      </section>

      <section className={`${tarjeta} space-y-3`}>
        <h2 className="text-lg font-semibold">Cuenta el efectivo</h2>
        <p className="text-sm text-barro">
          Cuenta los billetes y monedas de la caja y escribe el total.
        </p>
        <TecladoMonto
          valor={contado}
          onChange={(v) => {
            setContado(v)
            setError(null)
          }}
          etiqueta="Efectivo contado"
        />
        {centavosContados != null && <Diferencia diferencia={corte.diferencia} />}
        {error && <p className={textoError} role="alert">{error}</p>}
        <button
          type="button"
          disabled={centavosContados == null}
          onClick={() => setConfirmando(true)}
          className={`${botonPrimario} w-full`}
        >
          Cerrar caja
        </button>
      </section>

      {confirmando && (
        <Modal titulo="¿Cerrar la caja?" onCerrar={() => setConfirmando(false)}>
          <div className="space-y-3 text-sm">
            <p>Después de cerrar ya no se pueden registrar ventas ni gastos en esta caja.</p>
            <Diferencia diferencia={corte.diferencia} />
            {ventaEnCurso.lineas.length > 0 && (
              <p className={mensajeAviso}>
                Hay una venta sin cobrar con {ventaEnCurso.lineas.length} producto(s). Se conservará
                para la siguiente caja.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" className={botonSecundario} onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
              <button type="button" className={botonPrimario} onClick={cerrar}>
                Sí, cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Diferencia({ diferencia }: { diferencia: number }) {
  if (diferencia === 0) {
    return (
      <p className={mensajeExito} data-testid="diferencia">
        La caja cuadra exacto.
      </p>
    )
  }
  const sobra = diferencia > 0
  return (
    <p className={sobra ? mensajeAviso : mensajeError} data-testid="diferencia">
      {sobra ? 'Sobran' : 'Faltan'} <strong>{formatear(Math.abs(diferencia))}</strong>
    </p>
  )
}

export function ResumenCorte({ fondoInicial, corte }: { fondoInicial: number; corte: DatosCorte }) {
  return (
    <dl className="space-y-2 text-sm">
      <Renglon etiqueta="Ventas" valor={`${corte.numeroVentas}`} testId="corte-ventas" />
      <Renglon etiqueta="Total vendido" valor={formatear(corte.totalVentas)} fuerte testId="corte-total-vendido" />
      <div className="my-2 border-t border-linea" />
      <Renglon etiqueta="Efectivo" valor={formatear(corte.ventasEfectivo)} testId="corte-efectivo" />
      <Renglon etiqueta="Tarjeta" valor={formatear(corte.ventasTarjeta)} testId="corte-tarjeta" />
      <Renglon etiqueta="Transferencia" valor={formatear(corte.ventasTransferencia)} testId="corte-transferencia" />
      <div className="my-2 border-t border-linea" />
      <Renglon etiqueta="Fondo inicial" valor={formatear(fondoInicial)} testId="corte-fondo" />
      <Renglon etiqueta="+ Ventas en efectivo" valor={formatear(corte.ventasEfectivo)} testId="corte-mas-efectivo" />
      <Renglon etiqueta="− Gastos" valor={formatear(corte.gastos)} testId="corte-gastos" />
      <Renglon etiqueta="Efectivo esperado en caja" valor={formatear(corte.efectivoEsperado)} fuerte testId="corte-esperado" />
    </dl>
  )
}

function Renglon({
  etiqueta,
  valor,
  fuerte,
  testId,
}: {
  etiqueta: string
  valor: string
  fuerte?: boolean
  testId: string
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={fuerte ? 'font-semibold' : 'text-barro'}>{etiqueta}</dt>
      <dd className={(fuerte ? 'font-semibold' : '') + ' tabular-nums'} data-testid={testId}>
        {valor}
      </dd>
    </div>
  )
}
