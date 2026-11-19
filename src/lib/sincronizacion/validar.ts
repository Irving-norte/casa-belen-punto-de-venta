import type { Categoria, Catalogo, Existencias, Precio, Producto } from '../dominio/tipos'
import type { ErrorDeCatalogo } from './protocolo'

/**
 * Revisa lo que manda la hoja antes de usarlo. El script ya valida, pero un
 * producto mal formado no debe poder romper la pantalla de venta: se
 * descarta solo ese producto. Si no queda catálogo usable, se conserva el
 * anterior.
 */

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const esCentavos = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0

function precioValido(p: unknown): p is Precio {
  if (!p || typeof p !== 'object') return false
  const precio = p as Record<string, unknown>
  switch (precio.tipo) {
    case 'fijo':
      return esCentavos(precio.centavos)
    case 'tarifas':
      return esCentavos(precio.general) && esCentavos(precio.alumno)
    case 'variable':
      return esCentavos(precio.minimo) && esCentavos(precio.maximo) && precio.minimo <= precio.maximo
    default:
      return false
  }
}

function productoValido(p: unknown, categorias: Set<string>): p is Producto {
  if (!p || typeof p !== 'object') return false
  const x = p as Record<string, unknown>
  return (
    esTexto(x.id) &&
    esTexto(x.nombre) &&
    esTexto(x.categoriaId) &&
    categorias.has(x.categoriaId) &&
    precioValido(x.precio) &&
    (x.variantes === undefined || (Array.isArray(x.variantes) && x.variantes.every(esTexto))) &&
    (x.articulo === undefined || esTexto(x.articulo)) &&
    (x.descuenta === undefined || (typeof x.descuenta === 'number' && x.descuenta > 0))
  )
}

export function validarCatalogo(
  datos: unknown,
): { catalogo: Catalogo; errores: ErrorDeCatalogo[]; descartados: number } | null {
  if (!datos || typeof datos !== 'object') return null
  const d = datos as Record<string, unknown>
  if (!Array.isArray(d.categorias) || !Array.isArray(d.productos)) return null

  const categorias: Categoria[] = d.categorias
    .filter((c): c is Categoria => !!c && esTexto((c as Categoria).id) && esTexto((c as Categoria).nombre))
    .map((c) => ({ id: c.id, nombre: c.nombre }))
  const ids = new Set(categorias.map((c) => c.id))

  const vistos = new Set<string>()
  const productos: Producto[] = []
  for (const p of d.productos) {
    if (!productoValido(p, ids) || vistos.has(p.id)) continue
    vistos.add(p.id)
    productos.push({
      id: p.id,
      categoriaId: p.categoriaId,
      nombre: p.nombre,
      precio: p.precio,
      ...(p.variantes?.length ? { variantes: p.variantes } : {}),
      ...(p.articulo ? { articulo: p.articulo } : {}),
      ...(p.descuenta && p.descuenta !== 1 ? { descuenta: p.descuenta } : {}),
    })
  }
  if (productos.length === 0) return null

  // Solo las categorías que tienen algo que vender.
  const conProductos = new Set(productos.map((p) => p.categoriaId))
  const errores = Array.isArray(d.errores)
    ? (d.errores as ErrorDeCatalogo[]).filter((e) => e && esTexto(e.mensaje)).slice(0, 50)
    : []

  return {
    catalogo: { categorias: categorias.filter((c) => conProductos.has(c.id)), productos },
    errores,
    descartados: d.productos.length - productos.length,
  }
}

export function validarExistencias(datos: unknown): Existencias | null {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null
  const resultado: Existencias = {}
  for (const [clave, e] of Object.entries(datos as Record<string, unknown>)) {
    if (!e || typeof e !== 'object') continue
    const { cantidad, unidad } = e as Record<string, unknown>
    if (typeof cantidad !== 'number' || !Number.isFinite(cantidad)) continue
    resultado[clave] = { cantidad, unidad: typeof unidad === 'string' && unidad ? unidad : 'pieza' }
  }
  return resultado
}
