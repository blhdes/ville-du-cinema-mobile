import { StyleSheet, Platform } from 'react-native'

// ---------------------------------------------------------------------------
// Colors — Apple HIG-inspired flat palette
// ---------------------------------------------------------------------------
export const colors = {
  // ---- Semantic tokens (primary API) ----
  background: '#FCFAF8',
  backgroundSecondary: '#F2F2F7',
  foreground: '#1C1C1E',
  secondaryText: '#8E8E93',
  border: '#C6C6C8',
  accent: '#FF2D55',
  blue: '#2E86AB',
  white: '#FFFFFF',

  // ---- Brand accent palette (logo-derived) ----
  teal: '#2E86AB',
  red: '#D7263D',
  yellow: '#F2C14E',

  // ---- Legacy aliases (keep consumers compiling) ----
  /** @deprecated use `background` */
  cream: '#FCFAF8',
  /** @deprecated use `foreground` */
  black: '#1C1C1E',
  /** @deprecated use `secondaryText` */
  sepia: '#8E8E93',
  /** @deprecated use `secondaryText` */
  sepiaLight: '#C6C6C8',
  /** @deprecated use `backgroundSecondary` */
  surface: '#F2F2F7',
} as const

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
export const fonts = {
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
  body: { fontSize: 16, lineHeight: 24 },
  callout: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 13, lineHeight: 18 },

  // ---- Editorial / magazine presets ----
  magazineTitle: { fontSize: 28, lineHeight: 34 },
  magazineMeta: { fontSize: 11, lineHeight: 16, letterSpacing: 1.5, textTransform: 'uppercase' as const },
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
  /** Section header style */
  uppercase: {
    textTransform: 'uppercase',
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
