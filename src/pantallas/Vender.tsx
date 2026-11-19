import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../componentes/Modal'
import { TecladoMonto, textoACentavos } from '../componentes/TecladoMonto'
import {
  botonPeligro,
  botonPrimario,
  botonSecundario,
  botonTerciario,
  campoTexto,
  enlacePeligro,
  etiquetaAviso,
  opcion,
  textoError,
} from '../componentes/estilos'
import type { Existencias, Producto, TipoCliente } from '../lib/dominio/tipos'
import { formatear } from '../lib/dominio/dinero'
import { dentroDeRango, precioDeLista } from '../lib/dominio/precios'
import { piezasDe, subtotal } from '../lib/dominio/carrito'
import { useVentaEnCurso } from '../lib/hooks/ventaEnCurso'
import { useCatalogo } from '../lib/hooks/catalogo'
import { useExistencias } from '../lib/hooks/existencias'
import {
  claveExistencia,
  existenciaDeProducto,
  formatearCantidad,
  lineasSinExistencia,
  textoExistencia,
  type Existencia,
} from '../lib/dominio/existencias'
import { normalizarBusqueda } from '../lib/formato'

export default function Vender() {
  const venta = useVentaEnCurso()
  const { categorias, productos } = useCatalogo()
  const existencias = useExistencias()
  const [elegida, setCategoriaId] = useState(categorias[0]?.id ?? '')
  const [busqueda, setBusqueda] = useState('')
  const [eligiendoVariante, setEligiendoVariante] = useState<Producto | null>(null)
  const [capturandoPrecio, setCapturandoPrecio] = useState<Producto | null>(null)

  // Si la hoja quitó la categoría elegida, se muestra la primera.
  const categoriaId = categorias.some((c) => c.id === elegida) ? elegida : (categorias[0]?.id ?? '')

  const visibles = useMemo(() => {
    const q = normalizarBusqueda(busqueda)
    if (q) {
      const nombreCategoria = new Map(categorias.map((c) => [c.id, normalizarBusqueda(c.nombre)]))
      return productos.filter((p) =>
        `${normalizarBusqueda(p.nombre)} ${nombreCategoria.get(p.categoriaId)}`.includes(q),
      )
    }
    return productos.filter((p) => p.categoriaId === categoriaId)
  }, [busqueda, categoriaId, categorias, productos])

  function tocarProducto(producto: Producto) {
    if (producto.variantes?.length) return setEligiendoVariante(producto)
    if (producto.precio.tipo === 'variable') return setCapturandoPrecio(producto)
    venta.agregarProducto(producto)
  }

  return (
    <div className="grid h-full grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-1">
      {/* ---------- Catálogo ---------- */}
      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="shrink-0 space-y-3 p-4 pb-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto…"
            className={campoTexto}
          />
          {!busqueda && (
            <div className="flex flex-wrap gap-2">
              {categorias.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoriaId(c.id)}
                  aria-pressed={c.id === categoriaId}
                  className={'rounded-full px-3.5 py-1.5 text-sm ' + opcion(c.id === categoriaId)}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-2">
          {visibles.length === 0 ? (
            <p className="py-10 text-center text-barro">No hay productos que coincidan.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {visibles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid="producto"
                  data-producto-id={p.id}
                  onClick={() => tocarProducto(p)}
                  className="flex min-h-24 flex-col justify-between rounded-xl border border-linea bg-vela p-3 text-left text-espresso hover:border-terracota-500 active:border-terracota-500 active:bg-terracota-50"
                >
                  <span className="text-sm leading-snug" data-testid="producto-nombre">
                    {p.nombre}
                  </span>
                  <span className="mt-2 flex flex-col items-start gap-1">
                    <span className="text-sm font-semibold text-terracota-600" data-testid="producto-precio">
                      {etiquetaPrecio(p, venta.tipoCliente)}
                    </span>
                    <EtiquetaExistencia existencia={existencias && existenciaDeProducto(existencias, p)} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Venta en curso ---------- */}
      <Carrito existencias={existencias} />

      {eligiendoVariante && (
        <Modal titulo={eligiendoVariante.nombre} onCerrar={() => setEligiendoVariante(null)}>
          <p className="mb-3 text-sm text-barro">Elige el color</p>
          <div className="grid grid-cols-2 gap-2">
            {eligiendoVariante.variantes!.map((v) => (
              <button
                key={v}
                type="button"
                data-testid="variante"
                data-variante={v}
                className={`${botonSecundario} flex flex-col items-center gap-1`}
                onClick={() => {
                  venta.agregarProducto(eligiendoVariante, { variante: v })
                  setEligiendoVariante(null)
                }}
              >
                <span>{v}</span>
                <EtiquetaExistencia existencia={existencias?.[claveExistencia(eligiendoVariante, v)] ?? null} />
              </button>
            ))}
          </div>
        </Modal>
      )}

      {capturandoPrecio && (
        <CapturaPrecio
          producto={capturandoPrecio}
          onCerrar={() => setCapturandoPrecio(null)}
          onAgregar={(centavos) => {
            venta.agregarProducto(capturandoPrecio, { precioCapturado: centavos })
            setCapturandoPrecio(null)
          }}
        />
      )}
    </div>
  )
}

/** «Quedan 3» discreto; «Sin existencias» como aviso. Nada si la hoja no la conoce. */
function EtiquetaExistencia({ existencia }: { existencia: Existencia | null }) {
  if (!existencia) return null
  const agotado = existencia.cantidad <= 0
  return (
    <span
      data-testid="producto-existencia"
      className={agotado ? etiquetaAviso : 'text-xs font-normal text-barro'}
    >
      {textoExistencia(existencia)}
    </span>
  )
}

function etiquetaPrecio(producto: Producto, tipoCliente: TipoCliente): string {
  const { precio } = producto
  if (precio.tipo === 'variable') return `${formatear(precio.minimo)} – ${formatear(precio.maximo)}`
  const valor = formatear(precioDeLista(producto, tipoCliente)!)
  return precio.tipo === 'tarifas' && tipoCliente === 'alumno' ? `${valor} alumno` : valor
}

// ---------------------------------------------------------------------------

function CapturaPrecio({
  producto,
  onCerrar,
  onAgregar,
}: {
  producto: Producto
  onCerrar: () => void
  onAgregar: (centavos: number) => void
}) {
  const [texto, setTexto] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rango = producto.precio.tipo === 'variable' ? producto.precio : null

  function intentar() {
    const centavos = textoACentavos(texto)
    if (centavos == null || centavos <= 0) return setError('Escribe el precio')
    if (!dentroDeRango(producto, centavos)) return setConfirmando(true)
    onAgregar(centavos)
  }

  const centavos = textoACentavos(texto) ?? 0

  return (
    <Modal titulo={producto.nombre} onCerrar={onCerrar}>
      {!confirmando ? (
        <>
          {rango && (
            <p className="mb-3 text-sm text-barro">
              Precio normal entre {formatear(rango.minimo)} y {formatear(rango.maximo)}
            </p>
          )}
          <TecladoMonto
            valor={texto}
            onChange={(v) => {
              setTexto(v)
              setError(null)
            }}
            etiqueta="Precio de esta pieza"
          />
          {error && <p className={`mt-3 ${textoError}`} role="alert">{error}</p>}
          <button type="button" onClick={intentar} className={`${botonPrimario} mt-4 w-full`}>
            Agregar
          </button>
        </>
      ) : (
        <div className="space-y-4" role="alert">
          <p>
            <strong>{formatear(centavos)}</strong> está fuera del rango normal de este producto
            {rango && (
              <>
                {' '}
                ({formatear(rango.minimo)} – {formatear(rango.maximo)})
              </>
            )}
            . ¿Lo agregas de todos modos?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={botonSecundario} onClick={() => setConfirmando(false)}>
              Corregir
            </button>
            <button type="button" className={botonPrimario} onClick={() => onAgregar(centavos)}>
              Sí, agregar
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------

function Carrito({ existencias }: { existencias: Existencias | null }) {
  const venta = useVentaEnCurso()
  const { porId } = useCatalogo()
  const navegar = useNavigate()
  const [confirmarVaciar, setConfirmarVaciar] = useState(false)
  const faltan = useMemo(
    () => (existencias ? lineasSinExistencia(venta.lineas, existencias, (id) => porId.get(id)) : new Map<number, Existencia>()),
    [venta.lineas, existencias, porId],
  )

  return (
    <aside className="flex min-h-0 flex-col border-t border-linea bg-vela md:border-l md:border-t-0">
      <div className="shrink-0 border-b border-linea p-4">
        <div className="grid grid-cols-2 rounded-xl bg-manteca p-1" role="radiogroup" aria-label="Tipo de cliente">
          {(['general', 'alumno'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              role="radio"
              aria-checked={venta.tipoCliente === tipo}
              onClick={() => venta.cambiarTipoCliente(tipo)}
              className={
                'rounded-lg py-2 text-sm ' +
                (venta.tipoCliente === tipo
                  ? 'bg-salvia-600 font-semibold text-vela hover:bg-salvia-700'
                  : 'text-barro hover:bg-linea hover:text-espresso active:bg-linea')
              }
            >
              {tipo === 'general' ? 'General' : 'Alumno'}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {venta.lineas.length === 0 ? (
          <p className="py-10 text-center text-sm text-barro">Toca un producto para agregarlo.</p>
        ) : (
          <ul className="space-y-3">
            {venta.lineas.map((l, i) => (
              <li
                key={`${l.productoId}-${l.variante ?? ''}-${l.precioUnitario}`}
                data-testid="linea-carrito"
                data-producto-id={l.productoId}
                data-variante={l.variante ?? ''}
                className="border-b border-linea pb-3"
              >
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm leading-snug" data-testid="linea-nombre">
                      {l.nombre}
                      {l.variante && <span className="text-barro"> · {l.variante}</span>}
                    </p>
                    <p className="mt-0.5 flex items-center text-xs text-barro">
                      <span data-testid="linea-precio-unitario">{formatear(l.precioUnitario)}</span>&nbsp;c/u
                      {l.fueraDeRango && (
                        <span className={`ml-2 ${etiquetaAviso}`} data-testid="linea-fuera-de-rango">
                          Fuera de rango
                        </span>
                      )}
                    </p>
                    {faltan.has(i) && (
                      <p className="mt-1">
                        <span className={etiquetaAviso} data-testid="linea-sin-existencia">
                          {faltan.get(i)!.cantidad <= 0
                            ? 'Sin existencias según la hoja'
                            : `Según la hoja solo quedan ${formatearCantidad(faltan.get(i)!)}`}
                        </span>
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums" data-testid="linea-subtotal">
                    {formatear(subtotal(l))}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Quitar uno de ${l.nombre}`}
                    onClick={() => venta.cambiarCantidadLinea(i, l.cantidad - 1)}
                    className="h-10 w-10 rounded-lg bg-manteca text-lg text-espresso hover:bg-linea active:bg-linea-fuerte"
                  >
                    −
                  </button>
                  <span className="w-8 text-center tabular-nums" data-testid="linea-cantidad">
                    {l.cantidad}
                  </span>
                  <button
                    type="button"
                    aria-label={`Agregar uno de ${l.nombre}`}
                    onClick={() => venta.cambiarCantidadLinea(i, l.cantidad + 1)}
                    className="h-10 w-10 rounded-lg bg-manteca text-lg text-espresso hover:bg-linea active:bg-linea-fuerte"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => venta.quitarLinea(i)}
                    className={`ml-auto ${enlacePeligro}`}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-linea p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-barro">
            Total · {piezasDe(venta.lineas)} {piezasDe(venta.lineas) === 1 ? 'pieza' : 'piezas'}
          </span>
          <span className="text-3xl font-semibold tabular-nums" data-testid="total-venta">
            {formatear(venta.total)}
          </span>
        </div>
        <button
          type="button"
          disabled={venta.lineas.length === 0}
          onClick={() => navegar('/cobrar')}
          className={`${botonPrimario} w-full text-lg`}
        >
          Cobrar
        </button>
        {venta.lineas.length > 0 && (
          <button type="button" onClick={() => setConfirmarVaciar(true)} className={`w-full ${botonTerciario}`}>
            Vaciar venta
          </button>
        )}
      </div>

      {confirmarVaciar && (
        <Modal titulo="¿Vaciar la venta?" onCerrar={() => setConfirmarVaciar(false)}>
          <p className="mb-4 text-sm text-barro">Se quitan todos los productos de esta venta.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={botonSecundario} onClick={() => setConfirmarVaciar(false)}>
              No
            </button>
            <button
              type="button"
              className={botonPeligro}
              onClick={() => {
                venta.vaciar()
                setConfirmarVaciar(false)
              }}
            >
              Sí, vaciar
            </button>
          </div>
        </Modal>
      )}
    </aside>
  )
}
