import { useState, useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import RenderHtml from 'react-native-render-html'
import type { Review } from '@/types/database'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { colors, fonts, spacing, typography, getScaledTypography } from '@/theme'

interface ReviewCardProps {
  review: Review
}

const MAX_PREVIEW_LENGTH = 280
const HORIZONTAL_PAD = 20

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
  if (inTag) {
    const close = html.indexOf('>', i)
    if (close !== -1) i = close + 1
  }
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
  const contentWidth = width - HORIZONTAL_PAD * 2
  const scaled = useMemo(() => getScaledTypography(preferences.fontSizeLevel), [preferences.fontSizeLevel])

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
      }).toUpperCase()
    : ''

  const tagsStyles = useMemo(() => ({
    body: {
      fontFamily: fonts.body,
      fontSize: scaled.body.fontSize,
      lineHeight: scaled.body.lineHeight,
      color: colors.foreground,
    },
    p: {
      marginTop: 0,
      marginBottom: spacing.sm,
    },
    a: {
      color: colors.teal,
      textDecorationLine: 'none' as const,
    },
    i: { fontFamily: fonts.bodyItalic },
    em: { fontFamily: fonts.bodyItalic },
    b: { fontFamily: fonts.bodyBold },
    strong: { fontFamily: fonts.bodyBold },
  }), [scaled])

  const classesStyles = useMemo(() => {
    if (!preferences.useDropCap) return undefined
    const dropCapSize = scaled.title.fontSize * 3
    return {
      'drop-cap': {
        fontFamily: fonts.heading,
        fontSize: dropCapSize,
        lineHeight: dropCapSize,
        color: colors.foreground,
        textShadowColor: colors.teal,
        textShadowOffset: { width: 1.5, height: 1.5 },
        textShadowRadius: 0,
      },
    }
  }, [preferences.useDropCap, scaled])

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
    <View style={styles.article}>
      {/* Title */}
      <Pressable
        onPress={() => {
          const query = encodeURIComponent(`${review.movieTitle} film`)
          WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${query}`)
        }}
        style={({ pressed }) => pressed && styles.titlePressed}
      >
        <Text style={styles.movieTitle} numberOfLines={3}>
          {review.movieTitle}
        </Text>
      </Pressable>

      {/* Meta: BY AUTHOR · DATE · ★★★★ */}
      <Text style={styles.meta}>
        BY {review.creator.toUpperCase()}
        {dateStr ? ` \u00B7 ${dateStr}` : ''}
        {review.rating && !preferences.hideRatings ? (
          <Text style={styles.rating}> \u00B7 {review.rating}</Text>
        ) : null}
      </Text>

      {/* Review body */}
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
            <Text style={[styles.expandToggle, { fontSize: scaled.caption.fontSize }]}>
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
        {({ pressed }) => (
          <Text style={[styles.linkText, pressed && styles.linkPressed]}>
            VIEW ON LETTERBOXD
          </Text>
        )}
      </Pressable>

      {/* Hairline separator */}
      <View style={styles.divider} />
    </View>
  )
}

const styles = StyleSheet.create({
  article: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
  },
  titlePressed: {
    opacity: 0.6,
  },
  movieTitle: {
    fontFamily: fonts.heading,
    fontSize: typography.magazineTitle.fontSize,
    lineHeight: typography.magazineTitle.lineHeight,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: typography.magazineMeta.fontSize,
    lineHeight: typography.magazineMeta.lineHeight,
    letterSpacing: typography.magazineMeta.letterSpacing,
    color: colors.secondaryText,
    marginBottom: spacing.lg,
  },
  rating: {
    color: colors.yellow,
  },
  expandToggle: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.caption.fontSize,
    color: colors.teal,
    marginTop: spacing.sm,
  },
  linkButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-end',
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: typography.magazineMeta.fontSize,
    lineHeight: typography.magazineMeta.lineHeight,
    letterSpacing: typography.magazineMeta.letterSpacing,
    color: colors.secondaryText,
  },
  linkPressed: {
    color: colors.teal,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
  },
})
