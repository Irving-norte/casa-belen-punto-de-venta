import { useEffect, useSyncExternalStore } from 'react'
import { leerEstado, revisarRecordada, suscribir, type EstadoImpresora } from '../impresora/impresora'

/** Estado de la impresora; la primera vez busca la que la tablet ya tenía. */
export function useImpresora(): EstadoImpresora {
  const estado = useSyncExternalStore(suscribir, leerEstado)
  useEffect(() => {
    void revisarRecordada()
  }, [])
  return estado
}
