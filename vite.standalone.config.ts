// يبني نسخة «ملف واحد» تُفتح بالنقر المزدوج دون تثبيت أي شيء: npm run build:standalone
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  define: {
    'import.meta.env.VITE_HASH_ROUTER': JSON.stringify('1'),
    'import.meta.env.VITE_STANDALONE': JSON.stringify('1'),
  },
  publicDir: false,
  resolve: { alias: { 'virtual:pwa-register': '/src/test/noop-pwa.ts' } },
  build: { outDir: 'dist-standalone', assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 100_000 },
})
