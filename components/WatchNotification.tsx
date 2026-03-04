import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Review } from '@/types/database'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { colors, fonts, spacing, typography } from '@/theme'

interface WatchNotificationProps {
  review: Review
}

export default function WatchNotification({ review }: WatchNotificationProps) {
  const { preferences } = useDisplayPreferences()

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => Linking.openURL(review.link)}
    >
      <View style={styles.indicator} />
      <View style={styles.content}>
        <Text style={styles.text} numberOfLines={1}>
          <Text style={styles.username}>{review.creator}</Text>
          {' watched '}
          <Text style={styles.movie}>{review.movieTitle}</Text>
        </Text>
        {review.rating && !preferences.hideRatings ? (
          <Text style={styles.rating}>{review.rating}</Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.backgroundSecondary,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondaryText,
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    fontFamily: fonts.body,
    fontSize: typography.callout.fontSize,
    lineHeight: typography.callout.lineHeight,
    color: colors.foreground,
    flex: 1,
    marginRight: spacing.sm,
  },
  username: {
    fontFamily: fonts.bodyBold,
  },
  movie: {
    fontFamily: fonts.bodyItalic,
  },
  rating: {
    fontSize: typography.callout.fontSize,
    color: colors.accent,
  },
})
