import { useState } from 'react'
import { TecladoMonto, textoACentavos } from '../componentes/TecladoMonto'
import { atajo, botonPrimario, campoTexto, tarjeta, textoError } from '../componentes/estilos'
import type { Caja } from '../lib/dominio/tipos'
import { formatear } from '../lib/dominio/dinero'
import { registrarGasto } from '../lib/db/caja.repo'
import { useGastosDeCaja } from '../lib/hooks/useCaja'
import { formatearHora } from '../lib/formato'

const CONCEPTOS_FRECUENTES = ['Bolsas', 'Cajas', 'Papel', 'Limpieza', 'Comida']

export default function Gastos({ caja }: { caja: Caja }) {
  const gastos = useGastosDeCaja(caja.id)
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    try {
      await registrarGasto(concepto, textoACentavos(monto) ?? 0, nota)
      setConcepto('')
      setMonto('')
      setNota('')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el gasto')
    }
  }

  const total = (gastos ?? []).reduce((s, g) => s + g.monto, 0)

  return (
    <div className="mx-auto grid h-full max-w-5xl gap-4 overflow-y-auto p-4 md:grid-cols-[420px_1fr]">
      <section className={`${tarjeta} space-y-3`}>
        <h1 className="text-lg font-semibold">Registrar gasto</h1>
        <p className="text-sm text-barro">Dinero que sale de la caja en efectivo.</p>
        <input
          value={concepto}
          onChange={(e) => {
            setConcepto(e.target.value)
            setError(null)
          }}
          placeholder="Concepto"
          aria-label="Concepto"
          className={campoTexto}
        />
        <div className="flex flex-wrap gap-2">
          {CONCEPTOS_FRECUENTES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setConcepto(c)}
              className={atajo}
            >
              {c}
            </button>
          ))}
        </div>
        <TecladoMonto
          valor={monto}
          onChange={(v) => {
            setMonto(v)
            setError(null)
          }}
          etiqueta="Monto"
        />
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nota (opcional)"
          aria-label="Nota"
          className={campoTexto}
        />
        {error && <p className={textoError} role="alert">{error}</p>}
        <button type="button" onClick={guardar} className={`${botonPrimario} w-full`}>
          Guardar gasto
        </button>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Gastos de hoy</h2>
          <p className="text-sm text-barro">Total {formatear(total)}</p>
        </div>
        {!gastos || gastos.length === 0 ? (
          <p className="py-10 text-center text-barro">Sin gastos registrados.</p>
        ) : (
          <ul className={`${tarjeta} divide-y divide-linea p-0`}>
            {gastos.map((g) => (
              <li key={g.id} className="flex items-center gap-4 px-4 py-3">
                <span className="w-16 text-sm text-barro">{formatearHora(g.creadoEn)}</span>
                <span className="min-w-0 flex-1 text-sm">
                  {g.concepto}
                  {g.nota && <span className="block text-xs text-barro">{g.nota}</span>}
                </span>
                <span className="font-semibold tabular-nums">{formatear(g.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
