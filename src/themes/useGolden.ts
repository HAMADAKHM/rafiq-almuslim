import { useSettings } from '../state/SettingsContext'
import { useThemePreview } from './preview'
import { skinById } from './skins'

/** هل المظهر الجديد (تخطيط التصميم الذهبي) هو المعروض الآن */
export function useGolden(): boolean {
  const { settings } = useSettings()
  const preview = useThemePreview()
  // كل ثيمات الهوية تعرض المظهر الجديد بألوانها؛ «الذهبي الإسلامي» هو التصميم المعتمد نفسه
  return !!skinById(preview ?? settings.skin)?.identity
}
