import Svg, { Circle, Path } from 'react-native-svg'

interface LetterboxdDotsProps {
  size?: number
}

// Official Letterboxd brand colors
const ORANGE = '#FF8000'
const GREEN = '#00E054'
const BLUE = '#40BCF4'

const VIEWBOX_W = 378
const VIEWBOX_H = 140
const ASPECT = VIEWBOX_H / VIEWBOX_W
const R = 70

/**
 * Letterboxd three-dot logo in official brand colors (orange, green, blue)
 * with white overlap slivers, matching the mac icon reference.
 */
export default function LetterboxdDots({ size = 16 }: LetterboxdDotsProps) {
  return (
    <Svg
      width={size}
      height={size * ASPECT}
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
    >
      {/* Orange dot (left) */}
      <Circle cx="70" cy="70" r={R} fill={ORANGE} />
      {/* Green dot (center) */}
      <Circle cx="189" cy="70" r={R} fill={GREEN} />
      {/* Blue dot (right) */}
      <Circle cx="308" cy="70" r={R} fill={BLUE} />
      {/* White overlap slivers */}
      <Path
        d="M129.539,107.063C122.81,96.315 118.921,83.611 118.921,70 118.921,56.389 122.81,43.685 129.539,32.937 136.268,43.685 140.157,56.389 140.157,70 140.157,83.611 136.268,96.315 129.539,107.063Z"
        fill="#FFFFFF"
      />
      <Path
        d="M248.461,32.937C255.19,43.685 259.079,56.389 259.079,70 259.079,83.611 255.19,96.315 248.461,107.063 241.732,96.315 237.843,83.611 237.843,70 237.843,56.389 241.732,43.685 248.461,32.937Z"
        fill="#FFFFFF"
      />
    </Svg>
  )
}
