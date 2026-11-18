// Clases compartidas. Botones grandes: se usan con el dedo.
// En Tailwind 4, `hover:` solo aplica en equipos con mouse; con el dedo
// el estado que se siente es `active:` (presionado).
// El anillo de foco es global (index.css).

/** Acción principal: Cobrar, Abrir caja, Registrar pago, Guardar. */
export const botonPrimario =
  'rounded-xl bg-terracota-600 px-5 py-3.5 text-base font-semibold text-vela ' +
  'hover:bg-terracota-700 active:bg-terracota-800 ' +
  'disabled:bg-manteca disabled:text-ceniza'

/** Acción secundaria: Nueva venta, Corregir, Cancelar. */
export const botonSecundario =
  'rounded-xl border border-linea bg-vela px-5 py-3.5 text-base font-semibold text-espresso ' +
  'hover:border-arena hover:bg-manteca active:border-arena active:bg-linea ' +
  'disabled:text-ceniza'

/** Confirmación que borra: Sí, vaciar. */
export const botonPeligro =
  'rounded-xl bg-peligro-600 px-5 py-3.5 text-base font-semibold text-vela ' +
  'hover:bg-peligro-700 active:bg-peligro-700'

/** Acción de línea en texto: Quitar. */
export const enlacePeligro =
  'rounded-lg px-2 py-1.5 text-sm text-peligro-600 ' +
  'hover:bg-peligro-50 hover:text-peligro-700 active:bg-peligro-50 active:text-peligro-700'

/** Acción discreta en texto: Vaciar venta, Volver. */
export const botonTerciario =
  'rounded-lg px-3 py-2 text-sm text-barro hover:bg-manteca hover:text-espresso active:bg-linea'

/** Enlace de navegación dentro de una pantalla. */
export const enlace = 'text-sm text-terracota-700 hover:text-terracota-800 hover:underline'

/** Opción elegible (categoría, forma de pago, General/Alumno). */
export function opcion(seleccionada: boolean): string {
  return seleccionada
    ? 'border border-salvia-600 bg-salvia-600 font-semibold text-vela hover:border-salvia-700 hover:bg-salvia-700'
    : 'border border-linea bg-vela text-barro hover:border-arena hover:bg-manteca hover:text-espresso active:bg-linea'
}

/** Atajo que llena un valor (billetes, conceptos frecuentes). */
export const atajo =
  'rounded-full border border-linea bg-vela px-4 py-2 text-sm text-espresso ' +
  'hover:border-arena hover:bg-manteca active:bg-linea'

export const tarjeta = 'rounded-2xl border border-linea bg-vela p-4'

export const campoTexto =
  'w-full rounded-xl border border-arena bg-vela px-4 py-3 text-base text-espresso ' +
  'placeholder:text-barro hover:border-barro ' +
  'focus:border-terracota-500 focus:outline-none focus:ring-3 focus:ring-terracota-100 ' +
  'aria-invalid:border-peligro-600 disabled:border-linea disabled:bg-manteca disabled:text-ceniza'

/** Mensajes de estado: siempre con texto, nunca solo color. */
export const mensajeExito = 'rounded-xl bg-salvia-100 px-4 py-3 text-sm text-salvia-800'
export const mensajeAviso = 'rounded-xl bg-ambar-100 px-4 py-3 text-sm text-ambar-800'
export const mensajeError = 'rounded-xl bg-peligro-50 px-4 py-3 text-sm text-peligro-600'
export const mensajeNeutro = 'rounded-xl bg-manteca px-4 py-3 text-sm text-espresso'

export const etiquetaAviso = 'rounded-full bg-ambar-100 px-2.5 py-0.5 text-xs font-semibold text-ambar-800'

export const textoError = 'text-sm text-peligro-600'
