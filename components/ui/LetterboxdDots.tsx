import Svg, { Ellipse, Path } from 'react-native-svg'
import { colors } from '@/theme'

interface LetterboxdDotsProps {
  size?: number
  fill?: string
  overlapFill?: string
}

const VIEWBOX_W = 378
const VIEWBOX_H = 140
const ASPECT = VIEWBOX_H / VIEWBOX_W

/**
 * Letterboxd decal dots rendered as inline SVG for crisp output at any size.
 * `overlapFill` controls the overlap sliver color — set it to match your
 * background so the three-dot separation stays visible.
 */
export default function LetterboxdDots({
  size = 16,
  fill = colors.secondaryText,
  overlapFill = colors.background,
}: LetterboxdDotsProps) {
  return (
    <Svg
      width={size}
      height={size * ASPECT}
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
    >
      <Ellipse cx="70.079" cy="70" rx="70.079" ry="70" fill={fill} />
      <Ellipse cx="189" cy="70" rx="70.079" ry="70" fill={fill} />
      <Ellipse cx="307.921" cy="70" rx="70.079" ry="70" fill={fill} />
      <Path
        d="M129.539,107.063C122.81,96.315 118.921,83.611 118.921,70 118.921,56.389 122.81,43.685 129.539,32.937 136.268,43.685 140.157,56.389 140.157,70 140.157,83.611 136.268,96.315 129.539,107.063Z"
        fill={overlapFill}
      />
      <Path
        d="M248.461,32.937C255.19,43.685 259.079,56.389 259.079,70 259.079,83.611 255.19,96.315 248.461,107.063 241.732,96.315 237.843,83.611 237.843,70 237.843,56.389 241.732,43.685 248.461,32.937Z"
        fill={overlapFill}
      />
    </Svg>
  )
}
