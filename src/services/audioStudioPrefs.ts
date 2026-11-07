// صوت إتمام الأذكار المختار في «استوديو الأصوات» (يُقرأ من الإعدادات الحالية التي يضبطها التطبيق)
import { DEFAULT_AUDIO_STUDIO, type AudioStudioSettings } from '../state/settings'

let prefs: AudioStudioSettings = DEFAULT_AUDIO_STUDIO
export function setCompletionPrefs(p: AudioStudioSettings | undefined) { prefs = { ...DEFAULT_AUDIO_STUDIO, ...p } }
export const completionSound = () => (prefs.muteAll ? null : prefs.occasions.adhkarDone || null)
