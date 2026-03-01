import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Review } from '@/types/database'
import { colors, fonts, spacing, common } from '@/theme'

interface ReviewCardProps {
  review: Review
}

const MAX_PREVIEW_LENGTH = 200

export default function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isLong = review.review.length > MAX_PREVIEW_LENGTH
  const displayText = expanded || !isLong
    ? review.review
    : review.review.slice(0, MAX_PREVIEW_LENGTH) + '...'

  const dateStr = review.pubDate
    ? new Date(review.pubDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {review.movieTitle}
        </Text>
        {review.rating ? (
          <Text style={styles.rating}>{review.rating}</Text>
        ) : null}
      </View>

      <View style={styles.meta}>
        <Text style={styles.creator}>{review.creator}</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>

      {review.review ? (
        <Pressable onPress={() => isLong && setExpanded(!expanded)} disabled={!isLong}>
          <Text style={styles.reviewText}>{displayText}</Text>
          {isLong && (
            <Text style={styles.expandToggle}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
          )}
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => Linking.openURL(review.link)}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>VIEW ON LETTERBOXD</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.black,
    ...common.dropShadow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  movieTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.black,
    flex: 1,
    marginRight: spacing.sm,
  },
  rating: {
    fontSize: 16,
    color: colors.yellow,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  creator: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.sepia,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.sepia,
  },
  reviewText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.black,
    lineHeight: 22,
  },
  expandToggle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.blue,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  linkButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.sepia,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textDecorationLine: 'underline',
  },
})
