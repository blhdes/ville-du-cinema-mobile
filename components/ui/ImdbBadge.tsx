import Svg, { Rect, Text } from 'react-native-svg'

interface ImdbBadgeProps {
  size?: number
}

// Official IMDb brand color
const YELLOW = '#F5C518'

// Viewbox: 120 × 40, aspect 1:3
const VB_W = 120
const VB_H = 40

export default function ImdbBadge({ size = 16 }: ImdbBadgeProps) {
  const width = size * (VB_W / VB_H)
  return (
    <Svg width={width} height={size} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Rect x="0" y="0" width={VB_W} height={VB_H} rx="5" ry="5" fill={YELLOW} />
      <Text
        x={VB_W / 2}
        y="30"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fontSize="26"
        fill="#000000"
      >
        IMDb
      </Text>
    </Svg>
  )
}
