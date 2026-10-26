import { defineConfig, devices } from '@playwright/test'

// على Windows/macOS: شغّل مرة واحدة `npx playwright install chromium`.
// في بيئات فيها Chromium مثبت مسبقًا يمكن تحديد مساره عبر PW_CHROMIUM_PATH.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'ar',
    timezoneId: 'Asia/Hebron',
    launchOptions: { executablePath },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 }, launchOptions: { executablePath } } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    // متجر الاختبار لرفيق بلس (بلا أي دفع حقيقي) لاختبار الشراء والاستعادة والإلغاء والانتهاء
    env: { VITE_BILLING_SANDBOX: '1', VITE_ADS_PREVIEW: '1' },
    url: 'http://localhost:4173',
    reuseExistingServer: false, // نبني دائمًا نسخة جديدة حتى لا نختبر نسخة قديمة
    timeout: 180_000,
  },
})
