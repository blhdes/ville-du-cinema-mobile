import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Review } from '@/types/database'
import { colors, fonts, spacing } from '@/theme'

interface WatchNotificationProps {
  review: Review
}

export default function WatchNotification({ review }: WatchNotificationProps) {
  return (
    <Pressable
      style={styles.container}
      onPress={() => Linking.openURL(review.link)}
    >
      <View style={styles.dot} />
      <Text style={styles.text} numberOfLines={1}>
        <Text style={styles.username}>{review.creator}</Text>
        {' watched '}
        <Text style={styles.movie}>{review.movieTitle}</Text>
        {review.rating ? ` ${review.rating}` : ''}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.sepiaLight,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sepia,
    marginRight: spacing.sm,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.black,
    flex: 1,
  },
  username: {
    fontFamily: fonts.bodyBold,
  },
  movie: {
    fontFamily: fonts.bodyItalic,
  },
})
