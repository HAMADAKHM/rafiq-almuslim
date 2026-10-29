// تذكيرات الأذكار المسموعة (على طريقة تطبيقات الأذكار): لكل تذكير جملة قصيرة من الذكر نفسه تُسمع مع
// الإشعار — بتسجيل حصن المسلم، أو بصوت الهاتف العربي، أو بتسجيل المستخدم، أو نغمة عادية.
// منطق نقي بلا Capacitor (يستعمله الجدول والواجهة والاختبارات).
import { ADHKAR } from '../content/adhkar'
import type { NotificationSettings, VoiceOpt } from '../state/settings'

export type VoiceSlot = 'morning' | 'evening' | 'sleep' | 'wake' | 'afterPrayer'
export const VOICE_SLOTS: VoiceSlot[] = ['morning', 'evening', 'sleep', 'wake', 'afterPrayer']

export interface SlotDef {
  label: string
  /** الذكر في المكتبة (يُنطق منه ويُربط به تسجيل المستخدم) */
  itemId: string
  category: string
  /** مقطع حصن المسلم (HISN_CLIPS) */
  hisn: string
  /** ما يُسمع بتسجيل حصن المسلم */
  hisnHeard: string
  /** ما يُسمع بصوت الهاتف أو تسجيل المستخدم (الذكر نفسه) */
  ownHeard: string
  /** أي جمل الذكر (مفصولة بـ«، ») تُنطق بصوت الهاتف — من النص كما هو */
  parts: [number, number]
  defaultVoice: VoiceOpt
  title: string
  body: string
  route: string
}

export const SLOT_DEFS: Record<VoiceSlot, SlotDef> = {
  morning: {
    label: 'أذكار الصباح', itemId: 'm-asbahna', category: 'morning', hisn: 'm77s',
    hisnHeard: '«أصبحنا وأصبح الملك لله، والحمد لله»', ownHeard: '«أصبحنا وأصبح الملك لله، والحمد لله»', parts: [0, 2], defaultVoice: 'hisn',
    title: 'حان وقت أذكار الصباح 🌅', body: 'ابدأ يومك بذكر الله', route: '/adhkar-alert/morning',
  },
  evening: {
    // لا يوجد في حصن المسلم تسجيل لـ«أمسينا» (نسخ التسجيل 77 آليًا)؛ التسجيل البشري البديل ذكر يُقال صباحًا ومساءً
    label: 'أذكار المساء', itemId: 'e-amsayna', category: 'evening', hisn: 'e86',
    hisnHeard: '«بسم الله الذي لا يضر مع اسمه شيء…»', ownHeard: '«أمسينا وأمسى الملك لله، والحمد لله»', parts: [0, 2], defaultVoice: 'device',
    title: 'حان وقت أذكار المساء 🌇', body: 'حان وقت ذكر الله في المساء', route: '/adhkar-alert/evening',
  },
  sleep: {
    label: 'أذكار النوم', itemId: 's-bismika', category: 'sleep', hisn: 's102',
    hisnHeard: '«باسمك ربي وضعت جنبي»', ownHeard: '«باسمك ربي وضعت جنبي»', parts: [0, 1], defaultVoice: 'hisn',
    title: 'حان وقت أذكار النوم 🌙', body: 'قبل أن تنام: أذكار النوم في دقيقتين', route: '/adhkar-alert/sleep',
  },
  wake: {
    label: 'أذكار الاستيقاظ', itemId: 'w-ahyana', category: 'waking', hisn: 'w1',
    hisnHeard: '«الحمد لله الذي أحيانا بعدما أماتنا وإليه النشور»', ownHeard: '«الحمد لله الذي أحيانا بعدما أماتنا وإليه النشور»', parts: [0, 1], defaultVoice: 'hisn',
    title: 'صباح الخير — أذكار الاستيقاظ ☀️', body: 'ابدأ يومك بحمد الله', route: '/adhkar-alert/waking',
  },
  afterPrayer: {
    label: 'أذكار ما بعد الصلاة', itemId: 'p-istighfar', category: 'after-prayer', hisn: 'p66',
    hisnHeard: '«اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام»', ownHeard: '«اللهم أنت السلام ومنك السلام…»', parts: [1, 3], defaultVoice: 'hisn',
    title: 'أذكار ما بعد الصلاة 🤲', body: 'أستغفر الله، اللهم أنت السلام ومنك السلام', route: '/adhkar-alert/after-prayer',
  },
}

/** الاختيار الفعلي لكل تذكير (مع ترحيل إعدادات الصباح والمساء السابقة) */
export function voiceFor(n: Partial<Pick<NotificationSettings, 'voices' | 'morningVoice' | 'eveningVoice'>>, slot: VoiceSlot): VoiceOpt {
  return n.voices?.[slot] ?? (slot === 'morning' ? n.morningVoice : slot === 'evening' ? n.eveningVoice : undefined) ?? SLOT_DEFS[slot].defaultVoice
}

/** الجملة التي يقرؤها صوت الهاتف: جمل من نص الذكر كما هو (بلا تعليمات مثل «ثلاثًا») */
export function slotSpeech(slot: VoiceSlot): string {
  const d = SLOT_DEFS[slot]
  const item = ADHKAR.find((c) => c.id === d.category)?.items.find((x) => x.id === d.itemId)
  const parts = (item?.text ?? '').split('، ')
  return parts.slice(d.parts[0], d.parts[1]).join('، ').replace(/\s*\([^)]*\)/g, '').trim()
}

/** ما يُسمع فعليًا (لنص الإشعار): custom = قناة صوت الهاتف أو تسجيل المستخدم جاهزة */
export function heardText(slot: VoiceSlot, opt: VoiceOpt, custom: boolean): string {
  if (opt === 'tone') return ''
  return custom ? SLOT_DEFS[slot].ownHeard : SLOT_DEFS[slot].hisnHeard
}

/** لاحقة القناة: الاهتزاز (v/n) وإظهار النص على شاشة القفل (1 ظاهر، p مخفي) */
export function channelFlags(n: Pick<NotificationSettings, 'vibrate' | 'lockText'>): string {
  return `${n.vibrate === false ? 'n' : 'v'}${n.lockText === false ? 'p' : '1'}`
}
export const hisnClipChannel = (clip: string, flags = 'v1') => `rafiq-hisn-${clip}-${flags}`
