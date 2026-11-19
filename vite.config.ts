import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import pkg from './package.json' with { type: 'json' }

export default defineConfig(({ mode }) => {
  // Producción: /casa-belen-punto-de-venta/. QA se construye con
  // VITE_ENTORNO=qa y VITE_BASE=/casa-belen-punto-de-venta-qa/.
  // loadEnv también lee las variables VITE_* del entorno del sistema.
  const env = loadEnv(mode, '.', 'VITE_')
  const BASE = env.VITE_BASE || '/casa-belen-punto-de-venta/'
  const ES_QA = env.VITE_ENTORNO === 'qa'

  return {
    base: BASE,
    define: { __VERSION__: JSON.stringify(pkg.version) },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icons/favicon-64.png'],
        manifest: {
          name: ES_QA ? 'Casa Belén — Punto de venta (QA)' : 'Casa Belén — Punto de venta',
          short_name: ES_QA ? 'Caja QA' : 'Caja Casa Belén',
          description: 'Punto de venta de la tienda física de Cerería Casa Belén',
          lang: 'es-MX',
          id: BASE,
          start_url: BASE,
          scope: BASE,
          display: 'standalone',
          // La tablet se usa de pie en el mostrador, normalmente horizontal.
          orientation: 'any',
          background_color: '#FAF6EF',
          theme_color: '#FAF6EF',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          navigateFallback: BASE + 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  }
})
