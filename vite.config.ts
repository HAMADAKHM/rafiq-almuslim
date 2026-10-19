/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// التلاوات تُبث من everyayah.com؛ ما ينزّله المستخدم صراحةً يُخزَّن في ذاكرة "audio-offline".
const AUDIO_HOST = /^https:\/\/everyayah\.com\/data\//
const TAFSIR_HOST = /^https:\/\/(cdn\.jsdelivr\.net\/gh\/spa5k|raw\.githubusercontent\.com\/spa5k)\/tafsir_api/

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'رفيق المسلم | Islamic Companion',
        short_name: 'رفيق المسلم',
        description: 'تطبيق إسلامي مجاني — صدقة جارية عن روح المرحوم قصي بديع خلفه (أبو محمد)',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#0d4d3a',
        background_color: '#f7f4ec',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: AUDIO_HOST,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-offline',
              // لا تُخزَّن استجابات البث الجزئية (206)؛ يُخزَّن فقط ما نزّله المستخدم كاملًا.
              cacheableResponse: { statuses: [200] },
              rangeRequests: true,
            },
          },
          {
            urlPattern: TAFSIR_HOST,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'tafsir', cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 800 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
