import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ProveedorCatalogo } from './lib/hooks/catalogo'
import { ProveedorSincronizacion } from './lib/hooks/sincronizacion'
import { ProveedorVentaEnCurso } from './lib/hooks/ventaEnCurso'
import './index.css'

// Pide al navegador no desalojar la base local por falta de espacio.
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ProveedorCatalogo>
        <ProveedorSincronizacion>
          <ProveedorVentaEnCurso>
            <App />
          </ProveedorVentaEnCurso>
        </ProveedorSincronizacion>
      </ProveedorCatalogo>
    </HashRouter>
  </StrictMode>,
)
