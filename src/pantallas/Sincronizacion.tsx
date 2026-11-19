import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../componentes/Modal'
import {
  botonPeligro,
  botonPrimario,
  botonSecundario,
  botonTerciario,
  mensajeAviso,
  mensajeError,
  mensajeExito,
  tarjeta,
} from '../componentes/estilos'
import { desvincular } from '../lib/db/hoja.repo'
import { ES_QA } from '../lib/entorno'
import { formatearFechaHora, formatearHora } from '../lib/formato'
import { useCatalogo } from '../lib/hooks/catalogo'
import { useSincronizacion } from '../lib/hooks/sincronizacion'

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export default function Sincronizacion() {
  const { vinculacion, pendientes, estado, sincronizando, enLinea, sincronizarAhora } = useSincronizacion()
  const catalogo = useCatalogo()
  const [confirmarDesvincular, setConfirmarDesvincular] = useState(false)

  if (vinculacion === undefined) return null

  return (
    <div className="mx-auto h-full max-w-3xl space-y-4 overflow-y-auto p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">Hoja de inventario</h1>
        <Link to="/" className="text-sm text-terracota-700 hover:underline">
          Volver
        </Link>
      </div>

      <section className={tarjeta}>
        {!vinculacion ? (
          <div className="space-y-2" data-testid="hoja-sin-vincular">
            <h2 className="text-lg font-semibold">Esta tablet no está vinculada</h2>
            <p className="text-sm text-barro">
              Las ventas se guardan en la tablet. Para que suban a la hoja: en la hoja de Google abre el menú
              <strong> Casa Belén → Vincular tablet</strong>, copia el enlace y ábrelo en esta tablet.
            </p>
            {pendientes.total > 0 && (
              <p className={mensajeAviso} data-testid="pendientes">
                {resumenPendientes(pendientes)} esperando a que la tablet se vincule.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                Vinculada con «<span data-testid="hoja-nombre">{vinculacion.hoja}</span>»
                {ES_QA && <span className="text-barro"> · pruebas</span>}
              </h2>
              <p className="text-sm text-barro">Desde {formatearFechaHora(vinculacion.vinculadaEn)}</p>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="text-barro">Por subir</dt>
              <dd data-testid="pendientes">
                {pendientes.total === 0 ? 'Nada, todo está en la hoja' : resumenPendientes(pendientes)}
              </dd>
              <dt className="text-barro">Última sincronización</dt>
              <dd data-testid="ultima-sincronizacion">
                {estado.ultimoExito ? formatearFechaHora(estado.ultimoExito) : 'Todavía no'}
              </dd>
            </dl>

            {!enLinea ? (
              <p className={mensajeAviso} role="status">
                Sin internet. Todo se guarda en la tablet y se subirá cuando vuelva la conexión.
              </p>
            ) : estado.error ? (
              <p className={mensajeError} role="alert" data-testid="error-sincronizacion">
                {estado.error.mensaje} ({formatearHora(estado.error.en)}). Se reintentará sola.
              </p>
            ) : (
              estado.ultimoExito && (
                <p className={mensajeExito} role="status">
                  Todo en orden con la hoja.
                </p>
              )
            )}

            {estado.rechazados.length > 0 && (
              <div className={mensajeError} role="alert" data-testid="rechazados">
                <p className="font-semibold">La hoja no aceptó {plural(estado.rechazados.length, 'registro', 'registros')}:</p>
                <ul className="mt-1 list-disc pl-5">
                  {estado.rechazados.slice(0, 5).map((r) => (
                    <li key={r.id}>
                      {r.tipo === 'venta' ? 'Venta' : r.tipo === 'gasto' ? 'Gasto' : 'Corte'}: {r.motivo}
                    </li>
                  ))}
                </ul>
                <p className="mt-1">Siguen guardados en la tablet. Avisa a quien administra la hoja.</p>
              </div>
            )}

            <button
              type="button"
              className={`${botonPrimario} w-full`}
              disabled={sincronizando || !enLinea}
              onClick={() => void sincronizarAhora()}
            >
              {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
          </div>
        )}
      </section>

      <section className={tarjeta} data-testid="catalogo-origen" data-origen={catalogo.origen}>
        <h2 className="mb-1 text-lg font-semibold">Productos y precios</h2>
        {catalogo.origen === 'hoja' ? (
          <p className="text-sm">
            De la hoja: {plural(catalogo.productos.length, 'producto', 'productos')} (actualizados el{' '}
            {formatearFechaHora(catalogo.generadoEn!)})
          </p>
        ) : (
          <p className="text-sm">
            Los que trae la app ({catalogo.productos.length}). Se reemplazan por los de la hoja en la primera
            sincronización.
          </p>
        )}
        {catalogo.errores.length > 0 && (
          <div className={`${mensajeAviso} mt-3`} data-testid="errores-catalogo">
            <p className="font-semibold">
              {catalogo.errores.length === 1
                ? '1 renglón de la hoja tiene errores y no aparece para vender:'
                : `${catalogo.errores.length} renglones de la hoja tienen errores y no aparecen para vender:`}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {catalogo.errores.slice(0, 5).map((e) => (
                <li key={`${e.pestana}-${e.fila}`}>
                  {e.pestana}, renglón {e.fila}: {e.mensaje}
                </li>
              ))}
            </ul>
            <p className="mt-1">Corrígelos en la hoja (Casa Belén → Revisar productos).</p>
          </div>
        )}
      </section>

      {vinculacion && (
        <div className="text-center">
          <button type="button" className={botonTerciario} onClick={() => setConfirmarDesvincular(true)}>
            Desvincular esta tablet
          </button>
        </div>
      )}

      {confirmarDesvincular && (
        <Modal titulo="¿Desvincular de la hoja?" onCerrar={() => setConfirmarDesvincular(false)}>
          <p className="mb-4 text-sm text-barro">
            La tablet deja de subir ventas a la hoja. Lo que falte por subir se queda guardado en la tablet hasta que
            la vuelvas a vincular.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={botonSecundario} onClick={() => setConfirmarDesvincular(false)}>
              No
            </button>
            <button
              type="button"
              className={botonPeligro}
              onClick={async () => {
                await desvincular()
                setConfirmarDesvincular(false)
              }}
            >
              Sí, desvincular
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function resumenPendientes(p: { ventas: number; gastos: number; cajas: number }): string {
  const partes = [
    p.ventas && plural(p.ventas, 'venta', 'ventas'),
    p.gastos && plural(p.gastos, 'gasto', 'gastos'),
    p.cajas && plural(p.cajas, 'corte', 'cortes'),
  ].filter(Boolean)
  return partes.join(' · ')
}
