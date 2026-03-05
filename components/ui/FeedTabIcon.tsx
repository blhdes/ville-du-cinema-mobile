import Svg, { Text as SvgText } from 'react-native-svg'

interface FeedTabIconProps {
  size?: number
  fill?: string
}

export default function FeedTabIcon({ size = 24, fill = '#1C1C1E' }: FeedTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <SvgText
        x="100"
        y="160"
        fontFamily="PlayfairDisplay_700Bold"
        fontSize="180"
        fontWeight="900"
        textAnchor="middle"
        fill={fill}
      >
        V
      </SvgText>
    </Svg>
  )
}
