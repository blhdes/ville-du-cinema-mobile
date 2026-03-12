import { useState, useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Review } from '@/types/database'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useAvatarUrl } from '@/services/avatarCache'
import { colors, fonts, spacing, typography, getScaledTypography } from '@/theme'

interface ReviewCardProps {
  review: Review
  hideAuthor?: boolean
}

const MAX_PREVIEW_LENGTH = 300
const TOLERANCE_RATIO = 0.5
const HORIZONTAL_PAD = 20
const SYSTEM_FONTS = [
  ...defaultSystemFonts,
  fonts.heading,
  fonts.headingItalic,
  fonts.body,
  fonts.bodyBold,
  fonts.bodyItalic,
]

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

export default function ReviewCard({ review, hideAuthor = false }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { preferences } = useDisplayPreferences()
  const { width } = useWindowDimensions()
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const cachedAvatarUrl = useAvatarUrl(review.username)
  const contentWidth = width - HORIZONTAL_PAD * 2
  const scaled = useMemo(() => getScaledTypography(preferences.fontMultiplier), [preferences.fontMultiplier])

  const textLength = useMemo(() => htmlTextLength(review.review), [review.review])
  const isLong = textLength > MAX_PREVIEW_LENGTH * (1 + TOLERANCE_RATIO)

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
    i: { fontFamily: fonts.bodyItalic, fontStyle: 'normal' as const },
    em: { fontFamily: fonts.bodyItalic, fontStyle: 'normal' as const },
    b: { fontFamily: fonts.bodyBold, fontWeight: 'normal' as const },
    strong: { fontFamily: fonts.bodyBold, fontWeight: 'normal' as const },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.teal,
      paddingLeft: spacing.md,
      marginLeft: 0,
      marginRight: 0,
      fontFamily: fonts.bodyItalic,
      fontStyle: 'normal' as const,
      opacity: 0.85,
    },
    img: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: 6,
    },
    iframe: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
  }), [scaled])

  /** Extract the first letter for native drop cap rendering. */
  const dropCapData = useMemo(() => {
    if (!preferences.useDropCap || !displayHtml) return null
    const match = displayHtml.match(
      /^((?:\s*<[^>]+>)*)(\s*)([A-Za-z\u00C0-\u024F])([\s\S]*)$/,
    )
    if (!match) return null
    return {
      firstLetter: match[3],
      remainingHtml: match[1] + match[4],
    }
  }, [preferences.useDropCap, displayHtml])

  const dropCapSize = scaled.title.fontSize * 3

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

      {/* Meta: avatar · BY AUTHOR · DATE · ★★★★ — links to profile */}
      {!hideAuthor ? (
        <Pressable
          onPress={() => navigation.navigate('ExternalProfile', { username: review.username })}
          style={({ pressed }) => [styles.metaRow, pressed && styles.metaPressed]}
        >
          {cachedAvatarUrl ? (
            <Image
              source={cachedAvatarUrl}
              style={styles.avatar}
              cachePolicy="memory-disk"
            />
          ) : null}
          <Text style={styles.meta}>
            BY {review.creator.toUpperCase()}
            {dateStr ? ` \u00B7 ${dateStr}` : ''}
            {review.rating && preferences.showRatings ? (
              <Text style={styles.rating}>{` \u00B7 ${review.rating}`}</Text>
            ) : null}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {dateStr}
            {review.rating && preferences.showRatings ? (
              <Text style={styles.rating}>{dateStr ? ` \u00B7 ${review.rating}` : review.rating}</Text>
            ) : null}
          </Text>
        </View>
      )}

      {/* Review body */}
      {review.review ? (
        <Pressable onPress={() => !expanded && setExpanded(true)} disabled={!isLong || expanded}>
          {dropCapData ? (
            <View style={styles.dropCapRow}>
              <Text
                style={[
                  styles.dropCapLetter,
                  {
                    fontSize: dropCapSize,
                    lineHeight: dropCapSize * 1.15,
                    minWidth: dropCapSize * 0.75,
                  },
                ]}
                selectable
              >
                {dropCapData.firstLetter}
              </Text>
              <View style={styles.dropCapBody}>
                <RenderHtml
                  contentWidth={contentWidth - dropCapSize - spacing.xs}
                  source={{ html: dropCapData.remainingHtml }}
                  tagsStyles={tagsStyles}
                  systemFonts={SYSTEM_FONTS}
                  renderersProps={renderersProps}
                  defaultTextProps={{ selectable: true }}
                />
              </View>
            </View>
          ) : (
            <RenderHtml
              contentWidth={contentWidth}
              source={{ html: displayHtml }}
              tagsStyles={tagsStyles}
              systemFonts={SYSTEM_FONTS}
              renderersProps={renderersProps}
              defaultTextProps={{ selectable: true }}
            />
          )}
          {isLong && !expanded && (
            <Text style={[styles.expandToggle, { fontSize: scaled.caption.fontSize }]}>
              Read more
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  metaPressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: typography.magazineMeta.fontSize,
    lineHeight: typography.magazineMeta.lineHeight,
    letterSpacing: typography.magazineMeta.letterSpacing,
    color: colors.secondaryText,
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
  dropCapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dropCapLetter: {
    fontFamily: fonts.heading,
    color: colors.foreground,
    textShadowColor: colors.teal,
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
    marginRight: spacing.xs,
  },
  dropCapBody: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
  },
})
