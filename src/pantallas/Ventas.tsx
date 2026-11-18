import { Link } from 'react-router-dom'
import { etiquetaAviso, tarjeta } from '../componentes/estilos'
import type { Caja } from '../lib/dominio/tipos'
import { formatear } from '../lib/dominio/dinero'
import { NOMBRE_FORMA } from '../lib/dominio/pagos'
import { useVentasDeCaja } from '../lib/hooks/useCaja'
import { formatearHora } from '../lib/formato'

export default function Ventas({ caja }: { caja: Caja }) {
  const ventas = useVentasDeCaja(caja.id)
  if (!ventas) return null

  const total = ventas.reduce((s, v) => s + v.total, 0)
  const sinTicket = ventas.filter((v) => !v.ticketEnviadoEn).length

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto p-4">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Ventas del día</h1>
        <p className="text-sm text-barro">
          {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'} · {formatear(total)}
          {sinTicket > 0 && ` · ${sinTicket} sin ticket`}
        </p>
      </div>

      {ventas.length === 0 ? (
        <p className="py-10 text-center text-barro">Todavía no hay ventas en esta caja.</p>
      ) : (
        <ul className={`${tarjeta} divide-y divide-linea p-0`}>
          {ventas.map((v) => (
            <li key={v.id}>
              <Link to={`/venta/${v.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-manteca active:bg-linea">
                <span className="w-14 text-sm text-barro">#{v.folio}</span>
                <span className="w-16 text-sm text-barro">{formatearHora(v.creadaEn)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {[...new Set(v.pagos.map((p) => NOMBRE_FORMA[p.forma]))].join(' + ')}
                  {v.tipoCliente === 'alumno' && <span className="text-barro"> · Alumno</span>}
                </span>
                {!v.ticketEnviadoEn && (
                  <span className={etiquetaAviso}>Sin ticket</span>
                )}
                <span className="w-24 text-right font-semibold tabular-nums">{formatear(v.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
