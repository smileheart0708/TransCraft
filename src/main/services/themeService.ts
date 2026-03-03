import type { TitleBarOverlay } from 'electron'
import { nativeTheme } from 'electron'
import ElectronStore from 'electron-store'

export type ThemePreference = 'system' | 'light' | 'dark'
type ResolvedTheme = Exclude<ThemePreference, 'system'>

type OverlayThemePalette = {
  activeColor: string
  inactiveColor: string
  activeSymbolColor: string
  inactiveSymbolColor: string
  height: number
}

type ThemeStoreSchema = {
  theme: ThemePreference
}

const OVERLAY_THEMES = {
  dark: {
    activeColor: '#1e1d1b',
    inactiveColor: '#171615',
    activeSymbolColor: '#eeebe6',
    inactiveSymbolColor: '#ada79d',
    height: 36
  },
  light: {
    activeColor: '#f5f4f0',
    inactiveColor: '#efece6',
    activeSymbolColor: '#23211f',
    inactiveSymbolColor: '#5d5952',
    height: 36
  }
} satisfies Record<ResolvedTheme, OverlayThemePalette>

const WINDOW_BACKGROUND_COLORS = {
  dark: '#171615',
  light: '#f9f8f5'
} satisfies Record<ResolvedTheme, string>

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export class ThemeService {
  private readonly store: ElectronStore<ThemeStoreSchema>
  private preference: ThemePreference

  constructor() {
    this.store = new ElectronStore<ThemeStoreSchema>({
      defaults: {
        theme: 'system'
      }
    })

    this.preference = this.store.get('theme', 'system')
    this.applyNativeThemeSource()
  }

  getPreference(): ThemePreference {
    return this.preference
  }

  isFollowingSystem(): boolean {
    return this.preference === 'system'
  }

  setPreference(preference: ThemePreference): void {
    this.preference = preference
    this.store.set('theme', preference)
    this.applyNativeThemeSource()
  }

  getWindowBackgroundColor(): string {
    return WINDOW_BACKGROUND_COLORS[this.resolveTheme()]
  }

  resolveOverlayTheme(isFocused = true): TitleBarOverlay {
    const palette = OVERLAY_THEMES[this.resolveTheme()]

    return {
      color: isFocused ? palette.activeColor : palette.inactiveColor,
      symbolColor: isFocused ? palette.activeSymbolColor : palette.inactiveSymbolColor,
      height: palette.height
    }
  }

  private resolveTheme(): ResolvedTheme {
    return this.preference === 'system'
      ? nativeTheme.shouldUseDarkColors
        ? 'dark'
        : 'light'
      : this.preference
  }

  private applyNativeThemeSource(): void {
    nativeTheme.themeSource = this.preference
  }
}
