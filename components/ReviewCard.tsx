import { useState, useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import RenderHtml from 'react-native-render-html'
import type { Review } from '@/types/database'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { colors, fonts, spacing, typography } from '@/theme'

interface ReviewCardProps {
  review: Review
}

const MAX_PREVIEW_LENGTH = 280

/** Rough plain-text length of an HTML string (strip tags). */
function htmlTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').length
}

/** Truncate HTML to approximately `max` visible characters, closing open tags. */
function truncateHtml(html: string, max: number): string {
  let visible = 0
  let inTag = false
  let i = 0
  for (; i < html.length && visible < max; i++) {
    if (html[i] === '<') { inTag = true; continue }
    if (html[i] === '>') { inTag = false; continue }
    if (!inTag) visible++
  }
  // Find the end of any partially-opened tag
  if (inTag) {
    const close = html.indexOf('>', i)
    if (close !== -1) i = close + 1
  }
  // Close any open tags naively (good enough for simple inline HTML)
  const openTags = (html.slice(0, i).match(/<([a-z]+)\b[^>]*>/gi) || [])
    .map(t => t.match(/<([a-z]+)/i)?.[1] || '')
    .filter(Boolean)
  const closedTags = (html.slice(0, i).match(/<\/([a-z]+)>/gi) || [])
    .map(t => t.match(/<\/([a-z]+)>/i)?.[1] || '')
    .filter(Boolean)
  let suffix = '…'
  for (let j = openTags.length - 1; j >= 0; j--) {
    const tag = openTags[j]
    const closedIdx = closedTags.lastIndexOf(tag)
    if (closedIdx === -1) {
      suffix += `</${tag}>`
    } else {
      closedTags.splice(closedIdx, 1)
    }
  }
  return html.slice(0, i) + suffix
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { preferences } = useDisplayPreferences()
  const { width } = useWindowDimensions()
  const contentWidth = width - spacing.md * 4 // outer margin + inner padding

  const textLength = useMemo(() => htmlTextLength(review.review), [review.review])
  const isLong = textLength > MAX_PREVIEW_LENGTH

  const displayHtml = useMemo(
    () => expanded || !isLong ? review.review : truncateHtml(review.review, MAX_PREVIEW_LENGTH),
    [expanded, isLong, review.review],
  )

  const dateStr = review.pubDate
    ? new Date(review.pubDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  const tagsStyles = useMemo(() => ({
    body: {
      fontFamily: fonts.body,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
    },
    p: {
      marginTop: 0,
      marginBottom: spacing.xs,
    },
    a: {
      color: colors.blue,
      textDecorationLine: 'none' as const,
    },
    i: { fontFamily: fonts.bodyItalic },
    em: { fontFamily: fonts.bodyItalic },
    b: { fontFamily: fonts.bodyBold },
    strong: { fontFamily: fonts.bodyBold },
  }), [])

  const classesStyles = useMemo(() => {
    if (!preferences.useDropCap) return undefined
    return {
      'drop-cap': {
        fontFamily: fonts.heading,
        fontSize: typography.title1.fontSize * 1.6,
        lineHeight: typography.title1.fontSize * 1.6,
        color: colors.foreground,
      },
    }
  }, [preferences.useDropCap])

  // Wrap the first visible letter in a drop-cap span.
  // The regex skips over any leading HTML tags (e.g. <p>, <b>, <i>, <em>, <strong>)
  // to find the first real alphanumeric character outside of a tag.
  const processedHtml = useMemo(() => {
    if (!preferences.useDropCap || !displayHtml) return displayHtml
    return displayHtml.replace(
      /^((?:\s*<[^>]+>)*)(\s*)([A-Za-z\u00C0-\u024F])/,
      '$1$2<span class="drop-cap">$3</span>',
    )
  }, [preferences.useDropCap, displayHtml])

  const renderersProps = useMemo(() => ({
    a: {
      onPress: (_event: unknown, href: string) => Linking.openURL(href),
    },
  }), [])

  return (
    <View style={styles.card}>
      {/* Title row */}
      <View style={styles.header}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {review.movieTitle}
        </Text>
        {review.rating && !preferences.hideRatings ? (
          <Text style={styles.rating}>{review.rating}</Text>
        ) : null}
      </View>

      {/* Author & date */}
      <View style={styles.meta}>
        <Text style={styles.creator}>{review.creator}</Text>
        <Text style={styles.dot}>{'\u00B7'}</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>

      {/* Review body (rich HTML) */}
      {review.review ? (
        <Pressable onPress={() => isLong && setExpanded(!expanded)} disabled={!isLong}>
          <RenderHtml
            contentWidth={contentWidth}
            source={{ html: processedHtml }}
            tagsStyles={tagsStyles}
            classesStyles={classesStyles}
            renderersProps={renderersProps}
            defaultTextProps={{ selectable: true }}
          />
          {isLong && (
            <Text style={styles.expandToggle}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
          )}
        </Pressable>
      ) : null}

      {/* External link */}
      <Pressable
        onPress={() => Linking.openURL(review.link)}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>View on Letterboxd</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  movieTitle: {
    fontFamily: fonts.heading,
    fontSize: typography.title3.fontSize,
    lineHeight: typography.title3.lineHeight,
    color: colors.foreground,
    flex: 1,
    marginRight: spacing.sm,
  },
  rating: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.title3.lineHeight,
    color: colors.accent,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  creator: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.secondaryText,
  },
  dot: {
    fontSize: typography.caption.fontSize,
    color: colors.secondaryText,
    marginHorizontal: spacing.xs,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.secondaryText,
  },
  expandToggle: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.caption.fontSize,
    color: colors.blue,
    marginTop: spacing.xs,
  },
  linkButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.secondaryText,
  },
})
