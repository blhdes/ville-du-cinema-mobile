import { StyleSheet, Platform } from 'react-native'

// ---------------------------------------------------------------------------
// Color Types
// ---------------------------------------------------------------------------
export interface ThemeColors {
  // ---- Semantic tokens (primary API) ----
  background: string
  backgroundSecondary: string
  foreground: string
  secondaryText: string
  border: string
  accent: string
  blue: string
  white: string

  // ---- Brand accent palette (logo-derived) ----
  teal: string
  red: string
  yellow: string

  // ---- Legacy aliases ----
  /** @deprecated use `background` */
  cream: string
  /** @deprecated use `foreground` */
  black: string
  /** @deprecated use `secondaryText` */
  sepia: string
  /** @deprecated use `secondaryText` */
  sepiaLight: string
  /** @deprecated use `backgroundSecondary` */
  surface: string
}

// ---------------------------------------------------------------------------
// Light Palette (current defaults)
// ---------------------------------------------------------------------------
export const lightColors: ThemeColors = {
  background: '#FCFAF8',
  backgroundSecondary: '#F2F2F7',
  foreground: '#1C1C1E',
  secondaryText: '#8E8E93',
  border: '#C6C6C8',
  accent: '#FF2D55',
  blue: '#111111',
  white: '#FFFFFF',

  teal: '#111111',
  red: '#D7263D',
  yellow: '#F2C14E',

  cream: '#FCFAF8',
  black: '#1C1C1E',
  sepia: '#8E8E93',
  sepiaLight: '#C6C6C8',
  surface: '#F2F2F7',
}

// ---------------------------------------------------------------------------
// Dark Palette — charcoal base avoids OLED halation, warm tints
// keep the editorial feel, accent colors bumped for WCAG AA contrast
// ---------------------------------------------------------------------------
export const darkColors: ThemeColors = {
  background: '#171717',
  backgroundSecondary: '#1E1E1E',
  foreground: '#E8E4DF',
  secondaryText: '#9A9A9F',
  border: '#2C2C2E',
  accent: '#FF2D55',
  blue: '#F0F0F0',
  white: '#FFFFFF',

  teal: '#F0F0F0',
  red: '#E5475D',
  yellow: '#F2C14E',

  cream: '#171717',
  black: '#E8E4DF',
  sepia: '#9A9A9F',
  sepiaLight: '#2C2C2E',
  surface: '#1E1E1E',
}

// ---------------------------------------------------------------------------
// Helper — resolve palette by mode
// ---------------------------------------------------------------------------
export function getColors(mode: 'light' | 'dark'): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors
}

/**
 * Static color reference — defaults to light palette.
 * Prefer `useTheme().colors` in components for dark mode support.
 */
export const colors = lightColors

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
export const fonts = {
  // ---- System UI (San Francisco on iOS, Roboto on Android) ----
  system: Platform.select({ ios: 'System', default: 'sans-serif' }),

  // ---- Editorial serif ----
  heading: Platform.select({ ios: 'PlayfairDisplay_700Bold', default: 'PlayfairDisplay_700Bold' }),
  body: Platform.select({ ios: 'EBGaramond_400Regular', default: 'EBGaramond_400Regular' }),
  bodyBold: Platform.select({ ios: 'EBGaramond_700Bold', default: 'EBGaramond_700Bold' }),
  /** Fallback while custom fonts load */
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),

  // ---- Legacy aliases ----
  /** @deprecated use `heading` — italic should be applied explicitly */
  headingItalic: Platform.select({ ios: 'PlayfairDisplay_700Bold_Italic', default: 'PlayfairDisplay_700Bold_Italic' }),
  /** @deprecated apply italic style explicitly when needed */
  bodyItalic: Platform.select({ ios: 'EBGaramond_400Regular_Italic', default: 'EBGaramond_400Regular_Italic' }),
} as const

// ---------------------------------------------------------------------------
// Font sizes & line heights (HIG-aligned)
// ---------------------------------------------------------------------------
export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41 },
  title1: { fontSize: 28, lineHeight: 34 },
  title2: { fontSize: 22, lineHeight: 28 },
  title3: { fontSize: 20, lineHeight: 25 },
  body: { fontSize: 18, lineHeight: 26 },
  callout: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 13, lineHeight: 18 },

  // ---- Editorial / magazine presets ----
  magazineTitle: { fontSize: 28, lineHeight: 34 },
  magazineMeta: { fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  magazineBody: { fontSize: 16, lineHeight: 24 },
} as const

/**
 * Returns scaled typography values for the ReviewCard based on a font multiplier (0.8–1.4).
 * A multiplier of 1.0 is the default size.
 */
export function getScaledTypography(multiplier: number) {
  const round = (n: number) => Math.round(n)

  return {
    title: { fontSize: round(22 * multiplier), lineHeight: round(28 * multiplier) },
    body:  { fontSize: round(18 * multiplier), lineHeight: round(26 * multiplier) },
    caption: { fontSize: round(14 * multiplier), lineHeight: round(20 * multiplier) },
  }
}

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

// ---------------------------------------------------------------------------
// Common reusable styles
// ---------------------------------------------------------------------------
export const common = StyleSheet.create({
  /** Full-screen white background */
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  /** Subtle card border */
  cardBorder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
  },
  /** Soft elevation shadow (iOS-style) */
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  /** @deprecated no longer used — uppercase removed from design system */
  uppercase: {
    letterSpacing: 1,
  },

  // ---- Legacy aliases ----
  /** @deprecated use `cardBorder` */
  brutalistBorder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
  },
  /** @deprecated use `shadow` */
  dropShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
})
