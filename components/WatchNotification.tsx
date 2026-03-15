import { useMemo, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Review } from '@/types/database'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import EyeIcon from '@/components/ui/EyeIcon'

interface WatchNotificationProps {
  review: Review
  hideAuthor?: boolean
}

export default function WatchNotification({ review, hideAuthor = false }: WatchNotificationProps) {
  const { preferences } = useDisplayPreferences()
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const [titlePressed, setTitlePressed] = useState(false)
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => Linking.openURL(review.link)}
    >
      <EyeIcon size={14} color={colors.secondaryText} />
      <View style={styles.content}>
        {!hideAuthor && (
          <Text
            style={styles.author}
            onPress={() => navigation.navigate('ExternalProfile', { username: review.username })}
            suppressHighlighting
            numberOfLines={1}
          >
            {review.creator}
          </Text>
        )}
        <Text style={styles.watchedLabel} numberOfLines={1}>Watched</Text>
        <Text
          style={[styles.movie, titlePressed && styles.moviePressed]}
          onPressIn={() => setTitlePressed(true)}
          onPressOut={() => setTitlePressed(false)}
          onPress={() => {
            const query = encodeURIComponent(`${review.movieTitle} film`)
            WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${query}`)
          }}
          suppressHighlighting
          numberOfLines={1}
        >
          {review.movieTitle}
        </Text>
      </View>
      {review.rating && preferences.showRatings ? (
        <Text style={styles.rating}>{review.rating}</Text>
      ) : null}
    </Pressable>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pressed: {
      opacity: 0.6,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    author: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    watchedLabel: {
      fontFamily: fonts.body,
      textTransform: 'uppercase',
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    movie: {
      flex: 1,
      fontFamily: fonts.bodyItalic,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.foreground,
    },
    moviePressed: {
      opacity: 0.6,
    },
    rating: {
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.yellow,
    },
  })
}
