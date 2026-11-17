import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LineaVenta, Producto, TipoCliente } from '../dominio/tipos'
import { agregar, cambiarCantidad, quitar, recalcularPorTipoCliente, totalDe } from '../dominio/carrito'
import { PRODUCTOS_POR_ID } from '../../data/catalogo'

interface VentaEnCurso {
  tipoCliente: TipoCliente
  lineas: LineaVenta[]
  total: number
  cambiarTipoCliente: (tipo: TipoCliente) => void
  agregarProducto: (producto: Producto, opciones?: { variante?: string; precioCapturado?: number }) => void
  cambiarCantidadLinea: (indice: number, cantidad: number) => void
  quitarLinea: (indice: number) => void
  vaciar: () => void
}

const Contexto = createContext<VentaEnCurso | null>(null)

// Se guarda en el navegador para no perder el carrito si la app se recarga
// a media venta.
const CLAVE = 'casa-belen-pos:venta-en-curso'

interface Guardado {
  tipoCliente: TipoCliente
  lineas: LineaVenta[]
}

function leerGuardado(): Guardado {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) {
      const datos = JSON.parse(crudo) as Guardado
      if (Array.isArray(datos.lineas)) return datos
    }
  } catch {
    // almacenamiento no disponible o dato corrupto: se empieza vacío
  }
  return { tipoCliente: 'general', lineas: [] }
}

export function ProveedorVentaEnCurso({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Guardado>(leerGuardado)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado))
    } catch {
      // sin almacenamiento: el carrito solo vive en memoria
    }
  }, [estado])

  const valor = useMemo<VentaEnCurso>(
    () => ({
      ...estado,
      total: totalDe(estado.lineas),
      cambiarTipoCliente: (tipoCliente) =>
        setEstado((e) => ({
          tipoCliente,
          lineas: recalcularPorTipoCliente(e.lineas, tipoCliente, (id) => PRODUCTOS_POR_ID.get(id)),
        })),
      agregarProducto: (producto, opciones) =>
        setEstado((e) => ({ ...e, lineas: agregar(e.lineas, producto, e.tipoCliente, opciones) })),
      cambiarCantidadLinea: (indice, cantidad) =>
        setEstado((e) => ({ ...e, lineas: cambiarCantidad(e.lineas, indice, cantidad) })),
      quitarLinea: (indice) => setEstado((e) => ({ ...e, lineas: quitar(e.lineas, indice) })),
      vaciar: () => setEstado({ tipoCliente: 'general', lineas: [] }),
    }),
    [estado],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useVentaEnCurso(): VentaEnCurso {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useVentaEnCurso fuera de ProveedorVentaEnCurso')
  return valor
}
