import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { spacing } from '@/theme'

interface DividerProps {
  marginVertical?: number
  label?: string
}

export default function Divider({ marginVertical = spacing.md, label }: DividerProps) {
  const { colors } = useTheme()

  if (!label) {
    return <View style={[styles.line, { marginVertical, backgroundColor: colors.border }]} />
  }

  return (
    <View style={[styles.row, { marginVertical }]}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <Text style={[styles.label, { color: colors.secondaryText }]}>{label}</Text>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    marginHorizontal: 16,
    fontSize: 13,
  },
})
