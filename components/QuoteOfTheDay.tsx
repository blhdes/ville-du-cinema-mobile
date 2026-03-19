import { StyleSheet, View } from 'react-native'
import { getQuoteOfTheWeek } from '@/constants/filmmakerQuotes'
import { spacing } from '@/theme'
import FilmmakerQuote from '@/components/ui/FilmmakerQuote'

export default function QuoteOfTheDay() {
  const quote = getQuoteOfTheWeek()

  return (
    <View style={styles.wrapper}>
      <FilmmakerQuote text={quote.text} author={quote.author} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
})
