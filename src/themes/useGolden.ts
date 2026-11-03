import { useSettings } from '../state/SettingsContext'
import { useThemePreview } from './preview'
import { GOLDEN_ID } from './golden'

/** هل التصميم الذهبي هو المعروض الآن (مختار أو في المعاينة) */
export function useGolden(): boolean {
  const { settings } = useSettings()
  const preview = useThemePreview()
  return (preview ?? settings.skin) === GOLDEN_ID
}
