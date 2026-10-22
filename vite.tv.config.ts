// يبني شاشة التلفاز تطبيقًا منفصلًا (npm run build:tv) يُنشر صفحةً يفتحها متصفح التلفاز.
// المسارات نسبية (./) لتعمل من أي عنوان، والهدف متوافق مع متصفحات التلفاز الأقدم.
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist-tv',
    target: ['chrome69', 'safari12'],
    rollupOptions: { input: 'tv.html' },
  },
})
