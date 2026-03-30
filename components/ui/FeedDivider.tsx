import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export default function FeedDivider() {
  const { colors } = useTheme()
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
  },
})
