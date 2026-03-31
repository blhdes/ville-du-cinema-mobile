import Svg, { Rect, Text as SvgText } from 'react-native-svg'

interface LogoIconProps {
  size?: number
  fill?: string
}

export default function LogoIcon({ size = 24, fill = '#1C1C1E' }: LogoIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 112 112">
      {/* Square outline */}
      <Rect x="2" y="2" width="108" height="108" fill="none" stroke={fill} strokeWidth="5" />

      {/* V */}
      <SvgText
        x="56"
        y="85"
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
