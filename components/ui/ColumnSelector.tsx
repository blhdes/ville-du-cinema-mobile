import { Pressable, StyleSheet, View } from 'react-native'
import { colors } from '@/theme'

interface ColumnSelectorProps {
  value: 1 | 2 | 3
  onValueChange: (value: 1 | 2 | 3) => void
  disabled?: boolean
}

function ColumnIcon({ count, active }: { count: number; active: boolean }) {
  return (
    <View style={iconStyles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[iconStyles.bar, active && iconStyles.barActive]}
        />
      ))}
    </View>
  )
}

export default function ColumnSelector({ value, onValueChange, disabled }: ColumnSelectorProps) {
  const options: (1 | 2 | 3)[] = [1, 2, 3]

  return (
    <View style={styles.container}>
      {options.map((count) => (
        <Pressable
          key={count}
          onPress={() => !disabled && onValueChange(count)}
          style={[
            styles.option,
            value === count && styles.optionActive,
            disabled && styles.disabled,
          ]}
          accessibilityLabel={`${count} column${count > 1 ? 's' : ''}`}
          accessibilityState={{ selected: value === count }}
        >
          <ColumnIcon count={count} active={value === count} />
        </Pressable>
      ))}
    </View>
  )
}

const iconStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 3,
  },
  bar: {
    width: 4,
    height: 16,
    borderRadius: 1,
    backgroundColor: colors.border,
  },
  barActive: {
    backgroundColor: colors.blue,
  },
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    width: 40,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  optionActive: {
    backgroundColor: colors.background,
    borderColor: colors.blue,
    borderWidth: 1.5,
  },
  disabled: {
    opacity: 0.4,
  },
})
