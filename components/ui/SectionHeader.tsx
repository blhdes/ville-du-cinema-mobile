import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing } from '@/theme'

interface SectionHeaderProps {
  title: string
  color?: 'white' | 'yellow'
}

export default function SectionHeader({ title, color = 'white' }: SectionHeaderProps) {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.foreground }]}>
      <Text style={[styles.title, { color: color === 'yellow' ? colors.yellow : colors.background }]}>
        {title}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 14,
    letterSpacing: 0.4,
  },
})
