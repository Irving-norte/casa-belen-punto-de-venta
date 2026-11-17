import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import pkg from './package.json' with { type: 'json' }

const BASE = '/casa-belen-punto-de-venta/'

export default defineConfig({
  base: BASE,
  define: { __VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/favicon-64.png'],
      manifest: {
        name: 'Casa Belén — Punto de venta',
        short_name: 'Caja Casa Belén',
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
})
