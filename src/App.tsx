import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import AvisoActualizacion from './componentes/AvisoActualizacion'
import { useCajaAbierta } from './lib/hooks/useCaja'
import { formatearHora } from './lib/formato'
import { ES_QA } from './lib/entorno'
import Apertura from './pantallas/Apertura'
import Vender from './pantallas/Vender'
import Cobrar from './pantallas/Cobrar'
import Ticket from './pantallas/Ticket'
import Ventas from './pantallas/Ventas'
import Gastos from './pantallas/Gastos'
import Corte from './pantallas/Corte'

const NAV = [
  { a: '/', texto: 'Vender' },
  { a: '/ventas', texto: 'Ventas del día' },
  { a: '/gastos', texto: 'Gastos' },
  { a: '/corte', texto: 'Corte' },
]

function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine)
    window.addEventListener('online', actualizar)
    window.addEventListener('offline', actualizar)
    return () => {
      window.removeEventListener('online', actualizar)
      window.removeEventListener('offline', actualizar)
    }
  }, [])
  return enLinea
}

export default function App() {
  const caja = useCajaAbierta()
  const enLinea = useEnLinea()

  return (
    <div className="flex h-full flex-col">
      {ES_QA && (
        <div
          className="shrink-0 bg-ambar-100 px-4 py-1 text-center text-xs font-semibold tracking-wide text-ambar-800"
          data-testid="franja-qa"
        >
          QA · datos de prueba — no usar para ventas reales
        </div>
      )}
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-linea bg-vela px-4 py-2">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}icons/marca.png`} alt="" className="h-8 w-auto" />
          <div className="leading-tight">
            <p className="text-[11px] tracking-[0.14em] text-barro">CASA BELÉN</p>
            <p className="text-sm font-medium">Punto de venta</p>
          </div>
        </div>

        {caja && (
          <nav className="flex gap-1">
            {NAV.map(({ a, texto }) => (
              <NavLink
                key={a}
                to={a}
                end={a === '/'}
                className={({ isActive }) =>
                  'border-b-3 px-4 py-2 text-sm ' +
                  (isActive
                    ? 'rounded-t-lg border-terracota-500 font-semibold text-espresso'
                    : 'rounded-lg border-transparent text-barro hover:bg-manteca hover:text-espresso active:bg-linea')
                }
              >
                {texto}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs text-barro">
          {!enLinea && (
            <span className="rounded-full bg-ambar-100 px-3 py-1 font-semibold text-ambar-800">
              Sin internet · se guarda en la tablet
            </span>
          )}
          {caja && <span data-testid="caja-abierta">Caja abierta desde {formatearHora(caja.abiertaEn)}</span>}
        </div>
      </header>

      <AvisoActualizacion />

      <main className="min-h-0 flex-1">
        {caja === undefined ? null : caja === null ? (
          <Apertura />
        ) : (
          <Routes>
            <Route path="/" element={<Vender />} />
            <Route path="/cobrar" element={<Cobrar />} />
            <Route path="/venta/:id" element={<Ticket />} />
            <Route path="/ventas" element={<Ventas caja={caja} />} />
            <Route path="/gastos" element={<Gastos caja={caja} />} />
            <Route path="/corte" element={<Corte caja={caja} />} />
            <Route path="*" element={<Vender />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
