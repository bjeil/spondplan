import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/spondplan/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Spondplan',
        short_name: 'Spondplan',
        description: 'Planlegg treningsøkter med data fra Spond',
        theme_color: '#132436',
        background_color: '#132436',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'nb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/spondplan/index.html',
        navigateFallbackDenylist: [/^\/spondplan\/assets\//]
      }
    })
  ]
})
