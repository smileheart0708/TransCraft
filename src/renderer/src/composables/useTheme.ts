import { computed, readonly, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  THEME_CYCLE_ORDER,
  applyThemeToDocument,
  getStoredThemePreference,
  observeSystemTheme,
  resolveTheme,
  setStoredThemePreference,
  type ResolvedTheme,
  type ThemePreference
} from '@renderer/services/themeService'

export type { ThemePreference, ResolvedTheme }

const themePreference = ref<ThemePreference>('system')
const systemTheme = ref<ResolvedTheme>('light')
const resolvedTheme = computed<ResolvedTheme>(() =>
  resolveTheme(themePreference.value, systemTheme.value)
)

let isInitialized = false
let hasLoadedStoredPreference = false
let hasUserChangedPreferenceBeforeLoad = false
let detachSystemThemeListener: (() => void) | null = null

async function syncThemePreference(preference: ThemePreference): Promise<void> {
  try {
    await setStoredThemePreference(preference)
  } catch (error) {
    console.error('[theme] Failed to sync preference with main process.', error)
  }
}

async function loadStoredThemePreference(): Promise<void> {
  if (hasLoadedStoredPreference || typeof window === 'undefined') return

  try {
    const storedPreference = await getStoredThemePreference()
    if (!hasUserChangedPreferenceBeforeLoad) {
      themePreference.value = storedPreference
    }
  } catch (error) {
    console.error('[theme] Failed to load preference from main process.', error)
  } finally {
    hasLoadedStoredPreference = true
    if (hasUserChangedPreferenceBeforeLoad) {
      void syncThemePreference(themePreference.value)
    }
  }
}

function initTheme(): void {
  if (isInitialized || typeof window === 'undefined') return
  isInitialized = true

  detachSystemThemeListener = observeSystemTheme((nextSystemTheme) => {
    systemTheme.value = nextSystemTheme
  })

  void loadStoredThemePreference()
}

function setThemePreference(nextPreference: ThemePreference): void {
  if (!hasLoadedStoredPreference) {
    hasUserChangedPreferenceBeforeLoad = true
  }

  themePreference.value = nextPreference

  if (hasLoadedStoredPreference) {
    void syncThemePreference(nextPreference)
  }
}

function cycleThemePreference(): ThemePreference {
  const currentIndex = THEME_CYCLE_ORDER.indexOf(themePreference.value)
  const nextIndex = (currentIndex + 1) % THEME_CYCLE_ORDER.length
  const nextPreference = THEME_CYCLE_ORDER[nextIndex] ?? 'system'
  setThemePreference(nextPreference)
  return nextPreference
}

watch(
  resolvedTheme,
  (theme) => {
    applyThemeToDocument(theme)
  },
  { immediate: true }
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    detachSystemThemeListener?.()
    detachSystemThemeListener = null
    isInitialized = false
    hasLoadedStoredPreference = false
    hasUserChangedPreferenceBeforeLoad = false
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
