import { computed, readonly, ref, watch, type ComputedRef, type Ref } from 'vue'

export type ThemePreference = 'auto' | 'light' | 'dark'
export type ResolvedTheme = Exclude<ThemePreference, 'auto'>

const THEME_CYCLE_ORDER: ThemePreference[] = ['auto', 'light', 'dark']
const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

const themePreference = ref<ThemePreference>('auto')
const systemTheme = ref<ResolvedTheme>('light')
const resolvedTheme = computed<ResolvedTheme>(() =>
  themePreference.value === 'auto' ? systemTheme.value : themePreference.value
)

let isInitialized = false
let detachMediaQueryListener: (() => void) | null = null

function applyThemeToDocument(theme: ResolvedTheme): void {
  const root = document.documentElement
  root.dataset['theme'] = theme
  root.style.colorScheme = theme
}

async function syncThemePreference(preference: ThemePreference): Promise<void> {
  try {
    await window.api.theme.setPreference(preference)
  } catch (error) {
    console.error('[theme] Failed to sync preference with main process.', error)
  }
}

function initTheme(): void {
  if (isInitialized || typeof window === 'undefined') return
  isInitialized = true

  const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
  systemTheme.value = mediaQuery.matches ? 'dark' : 'light'

  const onMediaQueryChange = (event: MediaQueryListEvent): void => {
    systemTheme.value = event.matches ? 'dark' : 'light'
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onMediaQueryChange)
    detachMediaQueryListener = () => mediaQuery.removeEventListener('change', onMediaQueryChange)
    return
  }

  mediaQuery.addListener(onMediaQueryChange)
  detachMediaQueryListener = () => mediaQuery.removeListener(onMediaQueryChange)
}

function setThemePreference(nextPreference: ThemePreference): void {
  themePreference.value = nextPreference
}

function cycleThemePreference(): ThemePreference {
  const currentIndex = THEME_CYCLE_ORDER.indexOf(themePreference.value)
  const nextIndex = (currentIndex + 1) % THEME_CYCLE_ORDER.length
  const nextPreference = THEME_CYCLE_ORDER[nextIndex] ?? 'auto'
  themePreference.value = nextPreference
  return nextPreference
}

watch(
  resolvedTheme,
  (theme) => {
    if (typeof document === 'undefined') return
    applyThemeToDocument(theme)
  },
  { immediate: true }
)

watch(
  themePreference,
  (preference) => {
    void syncThemePreference(preference)
  },
  { immediate: true }
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    detachMediaQueryListener?.()
    detachMediaQueryListener = null
    isInitialized = false
  })
}

type UseThemeResult = {
  themePreference: Readonly<Ref<ThemePreference>>
  systemTheme: Readonly<Ref<ResolvedTheme>>
  resolvedTheme: ComputedRef<ResolvedTheme>
  setThemePreference: (nextPreference: ThemePreference) => void
  cycleThemePreference: () => ThemePreference
  themeCycleOrder: ThemePreference[]
}

export function useTheme(): UseThemeResult {
  initTheme()

  return {
    themePreference: readonly(themePreference),
    systemTheme: readonly(systemTheme),
    resolvedTheme,
    setThemePreference,
    cycleThemePreference,
    themeCycleOrder: THEME_CYCLE_ORDER
  }
}
