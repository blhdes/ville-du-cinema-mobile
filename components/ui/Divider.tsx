import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { spacing } from '@/theme'

interface DividerProps {
  marginVertical?: number
}

export default function Divider({ marginVertical = spacing.md }: DividerProps) {
  const { colors } = useTheme()

  return <View style={[styles.line, { marginVertical, backgroundColor: colors.border }]} />
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
  },
})
