import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, type ThemeColors } from '@/theme'

interface FilmmakerQuoteProps {
  text: string
  author: string
}

export default function FilmmakerQuote({ text, author }: FilmmakerQuoteProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
      <Text style={styles.author}>— {author}</Text>
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 2,
    },
    text: {
      fontFamily: fonts.body,
      fontSize: 22,
      fontStyle: 'italic',
      color: colors.foreground,
      lineHeight: 34,
      marginBottom: 16,
    },
    author: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.secondaryText,
      letterSpacing: 0.5,
    },
  })
}
