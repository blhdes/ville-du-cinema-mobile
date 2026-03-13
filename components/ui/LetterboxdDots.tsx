import { Image } from 'expo-image'
import { colors } from '@/theme'

interface LetterboxdDotsProps {
  size?: number
  fill?: string
}

const ASPECT_RATIO = 140 / 378

/**
 * Official Letterboxd decal dots (neg-mono variant).
 * Uses the SVG asset directly rather than recreating the paths.
 */
export default function LetterboxdDots({
  size = 16,
  fill = colors.secondaryText,
}: LetterboxdDotsProps) {
  return (
    <Image
      source={require('@/assets/letterboxd-dots.svg')}
      style={{ width: size, height: size * ASPECT_RATIO }}
      tintColor={fill}
    />
  )
}
