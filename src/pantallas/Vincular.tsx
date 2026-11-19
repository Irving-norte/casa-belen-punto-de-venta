import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { botonPrimario, botonSecundario, mensajeAviso, mensajeError, mensajeExito, tarjeta } from '../componentes/estilos'
import { guardarVinculacion } from '../lib/db/hoja.repo'
import { ES_QA } from '../lib/entorno'
import { useSincronizacion } from '../lib/hooks/sincronizacion'
import { ErrorDeHoja, llamarHoja, urlDeHojaValida } from '../lib/sincronizacion/cliente'

type Comprobacion =
  | { estado: 'comprobando' }
  | { estado: 'lista'; hoja: string }
  | { estado: 'error'; mensaje: string; reintentable: boolean }

/**
 * Se abre con el enlace que genera la hoja (Casa Belén → Vincular tablet):
 * #/vincular?u=<url del script>&c=<clave>. Comprueba la hoja antes de
 * guardar nada.
 */
export default function Vincular() {
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const { vinculacion } = useSincronizacion()
  const url = parametros.get('u') ?? ''
  const clave = parametros.get('c') ?? ''
  const enlaceValido = urlDeHojaValida(url) && clave.length >= 16
  const [comprobacion, setComprobacion] = useState<Comprobacion>({ estado: 'comprobando' })
  const [intento, setIntento] = useState(0)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!enlaceValido) return
    let vigente = true
    setComprobacion({ estado: 'comprobando' })
    llamarHoja({ url, clave }, 'estado')
      .then((r) => vigente && setComprobacion({ estado: 'lista', hoja: r.hoja }))
      .catch((e: unknown) => {
        if (!vigente) return
        const tipo = e instanceof ErrorDeHoja ? e.tipo : 'interno'
        const mensaje = e instanceof Error ? e.message : 'No se pudo comprobar la hoja'
        setComprobacion({
          estado: 'error',
          mensaje:
            tipo === 'sin-conexion'
              ? 'No se pudo conectar con la hoja. Revisa el internet de la tablet. Si hay internet, genera un enlace nuevo en la hoja (Casa Belén → Vincular tablet) y revisa que la aplicación web tenga acceso «Cualquier usuario».'
              : mensaje,
          reintentable: tipo === 'sin-conexion' || tipo === 'tiempo' || tipo === 'respuesta' || tipo === 'interno',
        })
      })
    return () => {
      vigente = false
    }
  }, [url, clave, enlaceValido, intento])

  const mismaHoja = vinculacion?.url === url && vinculacion.clave === clave

  async function vincular() {
    if (comprobacion.estado !== 'lista') return
    setGuardando(true)
    await guardarVinculacion({ url, clave, hoja: comprobacion.hoja, vinculadaEn: Date.now() })
    // Al quedar vinculada, la sincronización arranca sola.
    navegar('/sincronizacion', { replace: true })
  }

  return (
    <div className="mx-auto h-full max-w-xl overflow-y-auto p-6">
      <section className={tarjeta}>
        <h1 className="mb-1 text-xl font-medium">Vincular con la hoja de inventario</h1>
        <p className="mb-4 text-sm text-barro">
          La tablet subirá a la hoja las ventas, gastos y cortes, y recibirá de ella los productos, precios y
          existencias.
        </p>

        {!enlaceValido ? (
          <p className={mensajeError} role="alert" data-testid="vincular-error">
            El enlace no es válido. Vuelve a copiarlo desde la hoja: Casa Belén → Vincular tablet.
          </p>
        ) : comprobacion.estado === 'comprobando' ? (
          <p className={mensajeAviso} data-testid="vincular-estado">
            Comprobando la hoja…
          </p>
        ) : comprobacion.estado === 'error' ? (
          <div className="space-y-3">
            <p className={mensajeError} role="alert" data-testid="vincular-error">
              {comprobacion.mensaje}
            </p>
            {comprobacion.reintentable && (
              <button type="button" className={botonSecundario} onClick={() => setIntento((n) => n + 1)}>
                Reintentar
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className={mensajeExito} data-testid="vincular-estado">
              Hoja encontrada: <strong data-testid="vincular-hoja">{comprobacion.hoja}</strong>
              {ES_QA && ' (hoja de pruebas)'}
            </p>
            {mismaHoja ? (
              <p className="text-sm">Esta tablet ya está vinculada con esta hoja.</p>
            ) : (
              vinculacion && (
                <p className={mensajeAviso}>
                  Esta tablet está vinculada con «{vinculacion.hoja}». Al vincular, se cambia a la nueva hoja. Lo que
                  falte por subir se subirá a la nueva.
                </p>
              )
            )}
            {!mismaHoja && (
              <button type="button" className={`${botonPrimario} w-full`} onClick={vincular} disabled={guardando}>
                Vincular esta tablet
              </button>
            )}
          </div>
        )}

        <p className="mt-4 text-center">
          <Link to={mismaHoja ? '/sincronizacion' : '/'} className="text-sm text-terracota-700 hover:underline">
            {mismaHoja ? 'Ir a Sincronización' : 'Cancelar'}
          </Link>
        </p>
      </section>
    </div>
  )
}
