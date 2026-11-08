// اختبارات شاشة التلفاز المبنية (npm run build:tv) في متصفح حقيقي: النسخة الجديدة ونسخة بريميوم (?ed=premium)
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e-tv',
  timeout: 70_000,
  use: {
    baseURL: 'http://localhost:4175',
    viewport: { width: 1920, height: 1080 },
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npx vite preview --config vite.tv.config.ts --port 4175 --strictPort',
    url: 'http://localhost:4175/tv.html',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
