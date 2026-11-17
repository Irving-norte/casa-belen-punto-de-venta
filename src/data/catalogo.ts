import type { Categoria, Precio, Producto } from '../lib/dominio/tipos'

/**
 * Catálogo de la tienda física. Fuentes (ver el proyecto en Claude):
 *  - Calculadora de pedidos (velas de punta, moldes, ceras, aditivos,
 *    pigmentos, complementos de escamada, estructuras).
 *  - PuntoDeVenta-CatalogoFaltante.md (frascos, extras, pigmentos por color,
 *    pabilos, goteros, mecheros, variables).
 *  - PuntoDeVenta-CatalogoAromas.md (aromas 30 ml y ¼ L, regulares y de temporada).
 *
 * Los precios se escriben en PESOS aquí por legibilidad y se convierten a
 * centavos al construir cada producto.
 */

export const CATEGORIAS: Categoria[] = [
  { id: 'variables', nombre: 'Variables' },
  { id: 'velas', nombre: 'Velas de punta' },
  { id: 'moldes-barro', nombre: 'Moldes de barro' },
  { id: 'moldes-madera', nombre: 'Moldes de madera' },
  { id: 'aromas-30', nombre: 'Aromas 30 ml' },
  { id: 'temporada-30', nombre: 'Temporada 30 ml' },
  { id: 'aromas-250', nombre: 'Aromas ¼ L' },
  { id: 'temporada-250', nombre: 'Temporada ¼ L' },
  { id: 'ceras', nombre: 'Ceras' },
  { id: 'extras', nombre: 'Extras' },
  { id: 'pigmentos', nombre: 'Pigmentos' },
  { id: 'pabilos', nombre: 'Pabilos' },
  { id: 'frascos', nombre: 'Frascos' },
  { id: 'goteros', nombre: 'Goteros' },
  { id: 'complementos', nombre: 'Complementos de escamada' },
  { id: 'estructuras', nombre: 'Estructuras de madera' },
]

// ---------------- Ayudantes ----------------

function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const fijo = (pesos: number): Precio => ({ tipo: 'fijo', centavos: pesos * 100 })
const tarifas = (general: number, alumno: number): Precio => ({
  tipo: 'tarifas',
  general: general * 100,
  alumno: alumno * 100,
})
const variable = (minimo: number, maximo: number): Precio => ({
  tipo: 'variable',
  minimo: minimo * 100,
  maximo: maximo * 100,
})

function producto(
  categoriaId: string,
  nombre: string,
  precio: Precio,
  extra: { codigo?: string; variantes?: string[] } = {},
): Producto {
  return {
    id: `${categoriaId}-${extra.codigo ?? slug(nombre)}`,
    categoriaId,
    nombre,
    precio,
    ...(extra.variantes ? { variantes: extra.variantes } : {}),
  }
}

/** [nombre, pesos] → productos de precio fijo */
function listaFija(categoriaId: string, filas: [string, number][]): Producto[] {
  return filas.map(([nombre, pesos]) => producto(categoriaId, nombre, fijo(pesos)))
}

// ---------------- Variables (precio capturado al vender) ----------------

const variables: Producto[] = [
  producto('variables', 'Cirio', variable(20, 300)),
  producto('variables', 'Portavelas de madera', variable(15, 350)),
  producto('variables', 'Portavelas de barro', variable(15, 350)),
  producto('variables', 'Copalero', variable(100, 400)),
  producto('variables', 'Vela de cera escamada', variable(200, 600)),
  producto('variables', 'Cirio de cera escamada', variable(200, 1500)),
]

// ---------------- Velas de punta ----------------

const velas: Producto[] = [
  producto('velas', 'Vela de punta chica', fijo(17)),
  producto('velas', 'Vela de punta mediana', fijo(19)),
  producto('velas', 'Vela de punta grande', fijo(22)),
]

// ---------------- Moldes: [general, alumno] por número ----------------

const TARIFAS_BARRO: [number, number][] = [
  [255, 225], [205, 185], [195, 175], [225, 185], [245, 215],
  [430, 390], [270, 240], [245, 215], [290, 260], [270, 240],
  [430, 390], [210, 190], [275, 245], [175, 145], [205, 175],
  [235, 205], [120, 95], [105, 75], [135, 105], [190, 170],
  [230, 190], [170, 140], [205, 175], [120, 95], [120, 95],
  [95, 65], [230, 190], [290, 270], [230, 190], [290, 270],
  [145, 110], [145, 110], [165, 135], [135, 95], [195, 165],
  [165, 145], [290, 260], [75, 55], [75, 55], [105, 85],
]

const TARIFAS_MADERA: [number, number][] = [
  [370, 340], [320, 290], [290, 260], [290, 260], [350, 330],
  [370, 340], [260, 230], [275, 245], [190, 160], [270, 240],
  [210, 180], [360, 330], [260, 230], [270, 240], [250, 220],
  [260, 230], [230, 200],
]

const moldes = (categoriaId: string, material: string, filas: [number, number][]) =>
  filas.map(([general, alumno], i) =>
    producto(categoriaId, `Molde de ${material} #${i + 1}`, tarifas(general, alumno), {
      codigo: String(i + 1),
    }),
  )

// ---------------- Aromas ----------------

const aromas30 = listaFija('aromas-30', [
  ['Vainilla', 52], ['Bebé', 54], ['Cereza', 42], ['Blue Berry', 52],
  ['Bergamota', 56], ['Chocolate', 60], ['Café Moka', 42], ['Miel', 52],
  ['Cítricos', 58], ['Rosas', 42], ['Nardo', 50], ['Manzana Canela', 59],
  ['Canela', 43], ['Lavanda', 43], ['Jazmín', 43], ['Fresa', 44],
  ['Chicle Frutal', 44], ['Coco', 48], ['Hierbabuena', 57], ['Mandarina', 58],
  ['Rosa de Castilla', 47], ['Mango', 55],
  ['Grosella', 50], ['Café', 53], ['Limón', 47], ['Té Blanco', 65],
  ['Durazno', 51], ['Bambú', 58], ['Menta', 57], ['Violeta', 49],
  ['Uva', 43], ['Gardenia', 48], ['Citronela', 53], ['Barbería', 57],
  ['Spa', 55], ['Pera Francesa', 55], ['Pastel', 52], ['Higo', 60],
  ['Dulce Paraíso', 60], ['Romero', 61],
])

const temporada30 = listaFija('temporada-30', [
  ['Pino Navideño', 53], ['Dulce Navidad', 48], ['Galleta de Jengibre', 52],
  ['Mirra Navidad', 57], ['Pay de Manzana', 63], ['Ponche Navideño', 47],
  ['Dulce de Frutos Rojos', 49], ['Madera Herbal', 57], ['Cedro', 61],
  ['Pay de Calabaza', 55], ['Flor de Cempasúchil', 47], ['Pan de Muerto', 55],
  ['Copal', 53], ['Palo Santo', 58], ['Frutos Rojos', 47], ['Champagne', 56],
  ['Cherry Punch', 48], ['Cera de Abeja', 55], ['Almendra', 47], ['Té Verde', 45],
  ['Clean and Fresh', 47], ['Avellana', 49], ['Sandía', 48],
])

const aromas250 = listaFija('aromas-250', [
  ['Violeta', 365], ['Bergamota', 420], ['Miel', 370], ['Té Blanco', 480],
  ['Coco', 345], ['Grosella', 370], ['Hierbabuena', 415], ['Fresa', 310],
  ['Nardo', 410], ['Chocolate', 440], ['Chicle Frutal', 340], ['Rosas', 300],
  ['Menta', 430], ['Café Moka', 280], ['Gardenia', 350], ['Lavanda', 300],
  ['Bambú', 425], ['Café', 380], ['Durazno', 370], ['Uva', 320],
])

const temporada250 = listaFija('temporada-250', [
  ['Pay de Calabaza', 420], ['Flor de Cempasúchil', 360], ['Pan de Muerto', 420],
  ['Palo Santo', 450], ['Copal', 400],
])

// ---------------- Ceras ----------------

const ceras = listaFija('ceras', [
  ['Soya APF 1 kg', 135], ['Soya APF ½ kg', 75],
  ['Soya BPF 1 kg', 120], ['Soya BPF ½ kg', 70],
  ['Cera de abeja 1 kg', 410],
  ['Parafina Malasia blanca 1 kg', 95], ['Parafina Malasia blanca ½ kg', 55],
  ['Parafina Malasia miel 1 kg', 105], ['Parafina Malasia miel ½ kg', 60],
  ['Parafina China 1 kg', 85], ['Parafina China ½ kg', 50],
  ['Cera nieve 1 kg', 140], ['Cera nieve ½ kg', 70],
  ['Cera flotante 1 kg', 145], ['Cera flotante ½ kg', 80],
  ['Cera flexible 1 kg', 150],
  ['Cera en gel 1 kg', 140],
  ['Lámina de cera de abeja (24 x 40 cm)', 45],
])

// ---------------- Extras (aditivos) ----------------

const extras = listaFija('extras', [
  ['Olimpia 25 g', 25],
  ['Estearina 25 g', 20],
  ['Protector UV 10 g', 55],
  ['Aceite desmoldante', 35],
  // Venía en la lista de pigmentos líquidos; no es un color, por eso va aquí.
  ['Ácido esteárico', 35],
])

// ---------------- Pigmentos (inventario por color) ----------------

const pigmentos: Producto[] = [
  producto('pigmentos', 'Pigmento líquido 10 ml', fijo(35), {
    variantes: ['Amarillo', 'Azul', 'Rojo', 'Morado'],
  }),
  producto('pigmentos', 'Pigmento líquido negro 10 ml', fijo(45)),
  producto('pigmentos', 'Pigmento sólido blanco', fijo(23)),
  producto('pigmentos', 'Pigmento sólido dorado', fijo(40)),
  producto('pigmentos', 'Pigmento en polvo 3 g', fijo(17)),
  producto('pigmentos', 'Pigmento en polvo 10 g', fijo(50)),
]

// ---------------- Pabilos ----------------

const pabilos = listaFija('pabilos', [
  ['Pabilo de madera', 1],
  ['Portapabilos de madera', 4],
  ['Pabilo con ficha chico', 3],
  ['Pabilo con ficha mediano', 3],
  ['Pabilo con ficha grande', 5],
  ['Ficha botón', 45],
  ['Ficha estrella', 45],
  ['Adhesivo para pabilo', 35],
])

// ---------------- Frascos y goteros ----------------

const frascos = listaFija('frascos', [
  ['Frasco con tapa 170 ml', 24],
  ['Frasco con tapa 200 ml', 23],
  ['Frasco con tapa 250 ml', 24],
  ['Frasco con tapa 280 ml', 25],
  ['Frasco ámbar con tapa 100 ml', 29],
  ['Frasco ámbar con tapa 230 ml', 37],
])

const goteros = listaFija('goteros', [
  ['Gotero de plástico grande', 17],
  ['Gotero de plástico chico', 7],
])

// ---------------- Con tarifa General / Alumno ----------------

const complementos: Producto[] = [
  producto('complementos', 'Escamador', tarifas(130, 110)),
  producto('complementos', 'Mechero', tarifas(95, 85)),
  producto('complementos', 'Base para cirios', tarifas(80, 70)),
]

const estructuras: Producto[] = [
  producto('estructuras', 'Estructura corazón', tarifas(35, 30)),
  producto('estructuras', 'Estructura círculo', tarifas(35, 30)),
  producto('estructuras', 'Estructura cuadrado / rombo', tarifas(35, 30)),
  producto('estructuras', 'Estructura óvalo', tarifas(35, 30)),
]

export const PRODUCTOS: Producto[] = [
  ...variables,
  ...velas,
  ...moldes('moldes-barro', 'barro', TARIFAS_BARRO),
  ...moldes('moldes-madera', 'madera', TARIFAS_MADERA),
  ...aromas30,
  ...temporada30,
  ...aromas250,
  ...temporada250,
  ...ceras,
  ...extras,
  ...pigmentos,
  ...pabilos,
  ...frascos,
  ...goteros,
  ...complementos,
  ...estructuras,
]

export const PRODUCTOS_POR_ID: ReadonlyMap<string, Producto> = new Map(
  PRODUCTOS.map((p) => [p.id, p]),
)
