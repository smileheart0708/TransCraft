export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

export const THEME_CYCLE_ORDER: ThemePreference[] = ['system', 'light', 'dark']
const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function resolveTheme(
  preference: ThemePreference,
  currentSystemTheme: ResolvedTheme
): ResolvedTheme {
  return preference === 'system' ? currentSystemTheme : preference
}

export function applyThemeToDocument(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset['theme'] = theme
  root.style.colorScheme = theme
}

export function observeSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
  onChange(mediaQuery.matches ? 'dark' : 'light')

  const onMediaQueryChange = (event: MediaQueryListEvent): void => {
    onChange(event.matches ? 'dark' : 'light')
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onMediaQueryChange)
    return () => mediaQuery.removeEventListener('change', onMediaQueryChange)
  }

  mediaQuery.addListener(onMediaQueryChange)
  return () => mediaQuery.removeListener(onMediaQueryChange)
}

export async function getStoredThemePreference(): Promise<ThemePreference> {
  return window.api.theme.getPreference()
}

export async function setStoredThemePreference(preference: ThemePreference): Promise<void> {
  await window.api.theme.setPreference(preference)
}
