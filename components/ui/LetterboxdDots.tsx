import Svg, { Ellipse } from 'react-native-svg'
import { colors } from '@/theme'

interface LetterboxdDotsProps {
  size?: number
  fill?: string
}

export default function LetterboxdDots({ size = 16, fill = colors.secondaryText }: LetterboxdDotsProps) {
  // Three overlapping dots from the Letterboxd decal, simplified to plain ellipses.
  // Original viewBox spans roughly x:0–378, y:0–140 for the dots group.
  return (
    <Svg width={size} height={size * 0.37} viewBox="0 0 378 140">
      <Ellipse cx="70" cy="70" rx="70" ry="70" fill={fill} opacity={0.5} />
      <Ellipse cx="189" cy="70" rx="70" ry="70" fill={fill} opacity={0.7} />
      <Ellipse cx="308" cy="70" rx="70" ry="70" fill={fill} opacity={0.5} />
    </Svg>
  )
}
