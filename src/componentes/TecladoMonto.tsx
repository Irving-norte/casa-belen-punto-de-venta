import { formatear } from '../lib/dominio/dinero'

/**
 * Teclado numérico en pantalla para capturar montos en pesos. Evita que
 * el teclado del sistema tape media pantalla de la tablet.
 *
 * `valor` es el texto en pesos tal como se teclea ("150", "150.5").
 */
export function TecladoMonto({
  valor,
  onChange,
  etiqueta,
  atajos = [],
}: {
  valor: string
  onChange: (valor: string) => void
  etiqueta?: string
  atajos?: { texto: string; valor: string }[]
}) {
  function teclear(tecla: string) {
    if (tecla === 'borrar') return onChange(valor.slice(0, -1))
    if (tecla === '.') {
      if (valor.includes('.')) return
      return onChange((valor || '0') + '.')
    }
    const [, decimales] = valor.split('.')
    if (decimales != null && decimales.length >= 2) return
    if (valor === '0') return onChange(tecla)
    if (valor.replace('.', '').length >= 8) return
    onChange(valor + tecla)
  }

  const centavos = textoACentavos(valor)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-linea bg-vela px-4 py-3 text-right">
        {etiqueta && <p className="text-left text-xs text-barro">{etiqueta}</p>}
        <p className="text-4xl font-medium tabular-nums" data-testid="teclado-display">
          {valor === '' ? <span className="text-barro/50">$0</span> : formatear(centavos ?? 0)}
        </p>
      </div>

      {atajos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {atajos.map((a) => (
            <button
              key={a.texto}
              type="button"
              onClick={() => onChange(a.valor)}
              className="rounded-full border border-linea bg-vela px-4 py-2 text-sm"
            >
              {a.texto}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'borrar'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => teclear(t)}
            aria-label={t === 'borrar' ? 'Borrar' : t}
            className="h-14 rounded-xl bg-manteca text-2xl font-medium active:bg-linea"
          >
            {t === 'borrar' ? '⌫' : t}
          </button>
        ))}
      </div>
    </div>
  )
}

/** "150.5" → 15050. Vacío o inválido → null. */
export function textoACentavos(texto: string): number | null {
  const limpio = texto.trim()
  if (limpio === '' || limpio === '.') return null
  const n = Number(limpio)
  if (!Number.isFinite(n) || n < 0) return null
  const [enteros = '0', decimales = ''] = limpio.split('.')
  return Number(enteros || '0') * 100 + Number((decimales + '00').slice(0, 2))
}
