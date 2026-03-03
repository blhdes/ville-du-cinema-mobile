import { StyleSheet, View } from 'react-native'
import { colors, spacing } from '@/theme'

interface DividerProps {
  marginVertical?: number
}

export default function Divider({ marginVertical = spacing.md }: DividerProps) {
  return <View style={[styles.line, { marginVertical }]} />
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
})
