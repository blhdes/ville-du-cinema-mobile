import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg'

interface EyeIconProps {
  size?: number
  color?: string
}

export default function EyeIcon({ size = 16, color = '#000' }: EyeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      {/* Eye outline */}
      <Path
        d="M256 128C140 128 48 256 48 256s92 128 208 128 208-128 208-128-92-128-208-128Z"
        stroke={color}
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Iris */}
      <Circle cx={256} cy={256} r={72} fill={color} />
      {/* Pupil highlight */}
      <Circle cx={232} cy={236} r={20} fill="none" stroke={color} strokeWidth={0} />
      {/* Eyelashes */}
      <Line x1={256} y1={48} x2={256} y2={128} stroke={color} strokeWidth={28} strokeLinecap="round" />
      <Line x1={160} y1={72} x2={192} y2={144} stroke={color} strokeWidth={28} strokeLinecap="round" />
      <Line x1={352} y1={72} x2={320} y2={144} stroke={color} strokeWidth={28} strokeLinecap="round" />
      <Line x1={96} y1={120} x2={144} y2={176} stroke={color} strokeWidth={28} strokeLinecap="round" />
      <Line x1={416} y1={120} x2={368} y2={176} stroke={color} strokeWidth={28} strokeLinecap="round" />
    </Svg>
  )
}
