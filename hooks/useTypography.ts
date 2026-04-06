import { useMemo } from 'react'
import { typography as baseTypography } from '@/theme'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SizePreset = { fontSize: number; lineHeight: number }
type MetaPreset = { fontSize: number; lineHeight: number; letterSpacing: number }

export interface ScaledTypography {
  largeTitle: SizePreset
  title1: SizePreset
  title2: SizePreset
  title3: SizePreset
  body: SizePreset
  callout: SizePreset
  caption: SizePreset
  magazineTitle: SizePreset
  magazineMeta: MetaPreset
  magazineBody: SizePreset
}

// ---------------------------------------------------------------------------
// Dampened scaling
//
// Body-range text (15–18 px) gets the full multiplier effect.
// Small text (≤ 14 px) and large text (≥ 20 px) get only half the effect
// so the UI stays usable at the extremes (0.8×–1.4×).
// ---------------------------------------------------------------------------

function scale(base: number, multiplier: number): number {
  const dampening = base >= 15 && base <= 16 ? 1.0 : 0.5
  return Math.round(base * (1 + (multiplier - 1) * dampening))
}

function scalePreset(preset: SizePreset, multiplier: number): SizePreset {
  return {
    fontSize: scale(preset.fontSize, multiplier),
    lineHeight: scale(preset.lineHeight, multiplier),
  }
}

function buildScaledTypography(multiplier: number): ScaledTypography {
  return {
    largeTitle: scalePreset(baseTypography.largeTitle, multiplier),
    title1: scalePreset(baseTypography.title1, multiplier),
    title2: scalePreset(baseTypography.title2, multiplier),
    title3: scalePreset(baseTypography.title3, multiplier),
    body: scalePreset(baseTypography.body, multiplier),
    callout: scalePreset(baseTypography.callout, multiplier),
    caption: scalePreset(baseTypography.caption, multiplier),
    magazineTitle: scalePreset(baseTypography.magazineTitle, multiplier),
    magazineMeta: {
      ...scalePreset(baseTypography.magazineMeta, multiplier),
      letterSpacing: baseTypography.magazineMeta.letterSpacing,
    },
    magazineBody: scalePreset(baseTypography.magazineBody, multiplier),
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTypography(): ScaledTypography {
  const { preferences } = useDisplayPreferences()
  const multiplier = preferences.fontMultiplier

  return useMemo(() => buildScaledTypography(multiplier), [multiplier])
}
