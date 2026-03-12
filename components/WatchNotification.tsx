import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Review } from '@/types/database'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { colors, fonts, spacing, typography } from '@/theme'

interface WatchNotificationProps {
  review: Review
  hideAuthor?: boolean
}

export default function WatchNotification({ review, hideAuthor = false }: WatchNotificationProps) {
  const { preferences } = useDisplayPreferences()
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const [titlePressed, setTitlePressed] = useState(false)

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => Linking.openURL(review.link)}
    >
      <View style={styles.dot} />
      <Text style={styles.text} numberOfLines={1}>
        {!hideAuthor && (
          <>
            <Text
              style={styles.author}
              onPress={() => navigation.navigate('ExternalProfile', { username: review.username })}
              suppressHighlighting
            >
              {review.creator}
            </Text>
            {' watched '}
          </>
        )}
        <Text
          style={[styles.movie, titlePressed && styles.moviePressed]}
          onPressIn={() => setTitlePressed(true)}
          onPressOut={() => setTitlePressed(false)}
          onPress={() => {
            const query = encodeURIComponent(`${review.movieTitle} film`)
            WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${query}`)
          }}
          suppressHighlighting
        >
          {hideAuthor ? `Watched ${review.movieTitle}` : review.movieTitle}
        </Text>
      </Text>
      {review.rating && preferences.showRatings ? (
        <Text style={styles.rating}>{review.rating}</Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.teal,
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typography.magazineMeta.fontSize,
    lineHeight: typography.magazineMeta.lineHeight,
    letterSpacing: typography.magazineMeta.letterSpacing,
    textTransform: 'uppercase',
    color: colors.secondaryText,
    marginRight: spacing.sm,
  },
  author: {
    fontFamily: fonts.bodyBold,
  },
  movie: {
    fontFamily: fonts.bodyItalic,
    textTransform: 'none',
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
