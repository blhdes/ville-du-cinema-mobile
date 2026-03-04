import Svg, { Polygon } from 'react-native-svg'

interface LogoIconProps {
  size?: number
  fill?: string
}

export default function LogoIcon({ size = 24, fill = '#1a1a1a' }: LogoIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Polygon points="100,160 40,40 70,40 100,120 130,40 160,40" fill={fill} />
    </Svg>
  )
}
