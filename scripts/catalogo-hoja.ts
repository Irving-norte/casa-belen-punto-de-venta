/**
 * Genera apps-script/CatalogoInicial.gs a partir del catálogo de arranque
 * (src/data/catalogo.ts). La hoja lo usa una sola vez: al preparar una hoja
 * con la pestaña Productos vacía.
 *
 *   npm run catalogo:hoja
 *
 * Node 22.18+ ejecuta TypeScript directamente (quita los tipos).
 */
import { writeFileSync } from 'node:fs'
import { CATEGORIAS, PRODUCTOS, UNIDADES_ARTICULO } from '../src/data/catalogo.ts'

const pesos = (centavos: number) => centavos / 100
const nombreCategoria = new Map(CATEGORIAS.map((c) => [c.id, c.nombre]))

// Mismas columnas que la pestaña Productos (apps-script/Codigo.gs, TABLAS.productos).
const productos = PRODUCTOS.map((p) => {
  const { precio } = p
  const general = precio.tipo === 'fijo' ? pesos(precio.centavos) : precio.tipo === 'tarifas' ? pesos(precio.general) : ''
  const alumno = precio.tipo === 'tarifas' ? pesos(precio.alumno) : ''
  const minimo = precio.tipo === 'variable' ? pesos(precio.minimo) : ''
  const maximo = precio.tipo === 'variable' ? pesos(precio.maximo) : ''
  return [
    p.id,
    nombreCategoria.get(p.categoriaId) ?? p.categoriaId,
    p.nombre,
    general,
    alumno,
    minimo,
    maximo,
    (p.variantes ?? []).join(', '),
    p.articulo ?? '',
    p.descuenta ?? '',
    'Sí',
  ]
})

const renglones = (filas: unknown[][]) => filas.map((f) => `    ${JSON.stringify(f)},`).join('\n')

const contenido = `/**
 * Catálogo inicial de la hoja. GENERADO por scripts/catalogo-hoja.ts desde
 * src/data/catalogo.ts: no lo edites a mano. Solo se usa al preparar una hoja
 * con la pestaña Productos vacía; después el catálogo vivo es la hoja.
 */
var CATALOGO_INICIAL = {
  categorias: [
${renglones(CATEGORIAS.map((c) => [c.id, c.nombre]))}
  ],
  // ID, Categoría, Nombre, Precio General, Precio Alumno, Precio mínimo,
  // Precio máximo, Variantes, Artículo, Descuenta, Activo
  productos: [
${renglones(productos)}
  ],
  unidades: ${JSON.stringify(UNIDADES_ARTICULO, null, 4).replace(/\n}/, '\n  }')},
};
`

const destino = new URL('../apps-script/CatalogoInicial.gs', import.meta.url)
writeFileSync(destino, contenido)
console.log(`apps-script/CatalogoInicial.gs: ${CATEGORIAS.length} categorías, ${productos.length} productos`)
