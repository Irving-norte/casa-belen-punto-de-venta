import type { ReactNode } from 'react'

export function Modal({
  titulo,
  onCerrar,
  children,
  ancho = 'max-w-md',
}: {
  titulo: string
  onCerrar: () => void
  children: ReactNode
  ancho?: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`w-full ${ancho} max-h-full overflow-y-auto rounded-2xl bg-cera p-5 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-medium">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 rounded-full px-3 py-1 text-2xl leading-none text-barro"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
