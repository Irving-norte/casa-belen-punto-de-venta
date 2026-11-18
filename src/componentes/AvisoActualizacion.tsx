import { useRegisterSW } from 'virtual:pwa-register/react'

export default function AvisoActualizacion() {
  const {
    needRefresh: [hayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW()

  if (!hayVersionNueva) return null

  return (
    <div className="flex items-center justify-between gap-3 border-b border-linea bg-salvia-100 px-4 py-2">
      <span className="text-sm text-salvia-800">Hay una versión nueva de la app</span>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="rounded-lg bg-terracota-600 px-4 py-2 text-sm font-semibold text-vela hover:bg-terracota-700 active:bg-terracota-800"
      >
        Actualizar
      </button>
    </div>
  )
}
