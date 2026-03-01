import { Pressable, StyleSheet, View } from 'react-native'
import { colors } from '@/theme'

interface ToggleProps {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
}

export default function Toggle({ value, onValueChange, disabled }: ToggleProps) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={[styles.track, value && styles.trackOn, disabled && styles.disabled]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={[styles.dot, value && styles.dotOn]} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.black,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  trackOn: {
    backgroundColor: colors.yellow,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.black,
  },
  dotOn: {
    alignSelf: 'flex-end',
  },
  disabled: {
    opacity: 0.4,
  },
})
