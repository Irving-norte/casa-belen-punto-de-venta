/**
 * Entorno en que se construyó la app: `produccion` (la tienda) o `qa`
 * (pruebas). Se fija al construir con `VITE_ENTORNO=qa`.
 *
 * QA y producción viven en el mismo dominio (irving-norte.github.io) y el
 * navegador separa los datos por dominio, no por ruta. Por eso cada
 * entorno usa su propia base de datos y sus propias claves de
 * almacenamiento: así, si un mismo navegador abre los dos, no se mezclan.
 */
export type Entorno = 'produccion' | 'qa'

export const ENTORNO: Entorno = import.meta.env.VITE_ENTORNO === 'qa' ? 'qa' : 'produccion'
export const ES_QA = ENTORNO === 'qa'

const SUFIJO = ES_QA ? '-qa' : ''

/** Nombre de la base IndexedDB. Producción conserva el nombre original. */
export const NOMBRE_BASE_DE_DATOS = `casa-belen-pos${SUFIJO}`

/** Prefijo de las claves de localStorage. */
export const PREFIJO_ALMACENAMIENTO = `casa-belen-pos${SUFIJO}`
