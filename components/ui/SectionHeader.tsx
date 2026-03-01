import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts, spacing } from '@/theme'

interface SectionHeaderProps {
  title: string
  color?: 'white' | 'yellow'
}

export default function SectionHeader({ title, color = 'white' }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: color === 'yellow' ? colors.yellow : colors.white }]}>
        {title}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.black,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
})
