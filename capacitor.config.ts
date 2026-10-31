import type { CapacitorConfig } from '@capacitor/cli'

// إعداد تطبيقي Android وiOS: يغلّفان نسخة الويب نفسها (مجلد dist) مع إضافات أصلية.
const config: CapacitorConfig = {
  appId: 'org.rafiqalmuslim.next',
  appName: 'رفيق المسلم الجديد',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_rafiq',
      iconColor: '#073B32',
    },
  },
}

export default config
