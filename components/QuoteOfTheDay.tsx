import { StyleSheet, Text, View } from 'react-native'
import { getQuoteOfTheWeek } from '@/constants/filmmakerQuotes'
import { colors, fonts, spacing } from '@/theme'

export default function QuoteOfTheDay() {
  const quote = getQuoteOfTheWeek()

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{quote.text}</Text>
      <Text style={styles.author}>— {quote.author}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.sepiaLight,
  },
  text: {
    fontFamily: fonts.bodyItalic,
    fontSize: 15,
    color: colors.sepia,
    lineHeight: 24,
  },
  author: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.sepia,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
})
