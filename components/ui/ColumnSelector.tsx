import { Pressable, StyleSheet, View } from 'react-native'
import { colors } from '@/theme'

interface ColumnSelectorProps {
  value: 1 | 2 | 3
  onValueChange: (value: 1 | 2 | 3) => void
  disabled?: boolean
}

function ColumnIcon({ count, active }: { count: number; active: boolean }) {
  return (
    <View style={styles.iconContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[styles.bar, active && styles.barActive]}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    width: 40,
    height: 32,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  optionActive: {
    backgroundColor: colors.yellow,
  },
  iconContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  bar: {
    width: 4,
    height: 16,
    backgroundColor: colors.sepiaLight,
  },
  barActive: {
    backgroundColor: colors.black,
  },
  disabled: {
    opacity: 0.4,
  },
})
