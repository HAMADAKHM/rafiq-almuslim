import type { CapacitorConfig } from '@capacitor/cli'

// إعداد تطبيقي Android وiOS: يغلّفان نسخة الويب نفسها (مجلد dist) مع إضافات أصلية.
const config: CapacitorConfig = {
  appId: 'org.rafiqalmuslim.app',
  appName: 'رفيق المسلم',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_rafiq',
      iconColor: '#0d4d3a',
    },
  },
}

export default config
