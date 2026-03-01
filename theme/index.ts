import { StyleSheet, Platform } from 'react-native'

// ---------------------------------------------------------------------------
// Colors — "Cahiers du Cinéma" brutalist palette
// ---------------------------------------------------------------------------
export const colors = {
  cream: '#fdfaf3',
  black: '#1a1a1a',
  sepia: '#8c7851',
  yellow: '#FFD600',
  red: '#E63946',
  blue: '#2E86AB',
  white: '#FFFFFF',
  /** Lighter sepia for secondary text / borders */
  sepiaLight: '#b5a58a',
  /** Card / surface background (slightly off-cream) */
  surface: '#f8f4eb',
} as const

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
export const fonts = {
  heading: Platform.select({ ios: 'PlayfairDisplay_700Bold', default: 'PlayfairDisplay_700Bold' }),
  headingItalic: Platform.select({ ios: 'PlayfairDisplay_700Bold_Italic', default: 'PlayfairDisplay_700Bold_Italic' }),
  body: Platform.select({ ios: 'EBGaramond_400Regular', default: 'EBGaramond_400Regular' }),
  bodyItalic: Platform.select({ ios: 'EBGaramond_400Regular_Italic', default: 'EBGaramond_400Regular_Italic' }),
  bodyBold: Platform.select({ ios: 'EBGaramond_700Bold', default: 'EBGaramond_700Bold' }),
  /** Fallback while custom fonts load */
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),
} as const

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
  /** Full-screen cream background */
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  /** Thick black border (brutalist) */
  brutalistBorder: {
    borderWidth: 2,
    borderColor: colors.black,
  },
  /** Hard drop shadow — right + bottom */
  dropShadow: {
    shadowColor: colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  /** Uppercase tracking text */
  uppercase: {
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
})
