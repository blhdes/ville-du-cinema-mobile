import { Switch } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

interface ToggleProps {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
}

export default function Toggle({ value, onValueChange, disabled }: ToggleProps) {
  const { colors } = useTheme()

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.border, true: colors.teal }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.border}
    />
  )
}
