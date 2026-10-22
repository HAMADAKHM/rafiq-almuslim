// يبني شاشة التلفاز تطبيقًا منفصلًا (npm run build:tv) يُنشر صفحةً يفتحها متصفح التلفاز.
// المسارات نسبية (./) لتعمل من أي عنوان، والهدف متوافق مع متصفحات التلفاز الأقدم.
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  // متصفحات التلفاز ومكوّن WebView فيها قد تكون قديمة جدًا: نسخة احتياطية (nomodule) مع الدوال الناقصة
  plugins: [react(), legacy({ targets: ['chrome >= 49', 'safari >= 10', 'android >= 5'], modernPolyfills: true })],
  build: {
    outDir: 'dist-tv',
    rollupOptions: { input: 'tv.html' },
  },
})
