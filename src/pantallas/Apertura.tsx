import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TecladoMonto, textoACentavos } from '../componentes/TecladoMonto'
import { botonPrimario, tarjeta } from '../componentes/estilos'
import { abrirCaja } from '../lib/db/caja.repo'
import { useUltimaCajaCerrada } from '../lib/hooks/useCaja'
import { formatear } from '../lib/dominio/dinero'
import { formatearFechaHora } from '../lib/formato'
import { ResumenCorte } from './Corte'

export default function Apertura() {
  const [fondo, setFondo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ultima = useUltimaCajaCerrada()
  const navegar = useNavigate()

  async function abrir() {
    const centavos = textoACentavos(fondo)
    if (centavos == null) return setError('Escribe el efectivo con el que abre la caja (puede ser 0)')
    try {
      await abrirCaja(centavos)
      navegar('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la caja')
    }
  }

  return (
    <div className="mx-auto grid h-full max-w-5xl gap-6 overflow-y-auto p-6 md:grid-cols-2">
      <section className={tarjeta}>
        <h1 className="mb-1 text-xl font-medium">Abrir caja</h1>
        <p className="mb-4 text-sm text-barro">
          Cuenta el efectivo con el que empiezas el día y escríbelo aquí.
        </p>
        <TecladoMonto
          valor={fondo}
          onChange={(v) => {
            setFondo(v)
            setError(null)
          }}
          etiqueta="Fondo inicial"
        />
        {error && <p className="mt-3 text-sm text-peligro">{error}</p>}
        <button type="button" onClick={abrir} className={`${botonPrimario} mt-4 w-full`}>
          Abrir caja
        </button>
      </section>

      {ultima?.corte && (
        <section className={tarjeta}>
          <h2 className="mb-1 text-lg font-medium">Último corte</h2>
          <p className="mb-4 text-sm text-barro">
            {formatearFechaHora(ultima.abiertaEn)} — {formatearFechaHora(ultima.cerradaEn!)}
          </p>
          <ResumenCorte fondoInicial={ultima.fondoInicial} corte={ultima.corte} />
          <p className="mt-4 text-sm">
            Efectivo contado: <strong>{formatear(ultima.corte.efectivoContado)}</strong>
          </p>
        </section>
      )}
    </div>
  )
}
