import Svg, { Rect, Text as SvgText } from 'react-native-svg'

interface LogoIconProps {
  size?: number
  fill?: string
}

export default function LogoIcon({ size = 24, fill = '#1C1C1E' }: LogoIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* Triple offset squares (RGB layers) */}
      <Rect x="46" y="46" width="108" height="108" fill="#E63946" />
      <Rect x="43" y="43" width="108" height="108" fill="#2E86AB" />
      <Rect x="40" y="40" width="108" height="108" fill="#FFD600" />

      {/* Main square */}
      <Rect x="37" y="37" width="108" height="108" fill="white" stroke={fill} strokeWidth="5" />

      {/* V */}
      <SvgText
        x="91"
        y="120"
        fontFamily="PlayfairDisplay_700Bold"
        fontSize="72"
        fontWeight="900"
        textAnchor="middle"
        fill={fill}
      >
        V
      </SvgText>
    </Svg>
  )
}
