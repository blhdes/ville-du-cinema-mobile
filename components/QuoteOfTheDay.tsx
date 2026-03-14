import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { getQuoteOfTheWeek } from '@/constants/filmmakerQuotes'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'

export default function QuoteOfTheDay() {
  const quote = getQuoteOfTheWeek()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{quote.text}</Text>
      <Text style={styles.author}>— {quote.author}</Text>
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: spacing.xl,
      marginHorizontal: spacing.md,
      marginBottom: spacing.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: {
      fontFamily: fonts.bodyItalic,
      fontSize: 15,
      color: colors.secondaryText,
      lineHeight: 24,
    },
    author: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: 'right',
      marginTop: spacing.sm,
    },
  })
}
