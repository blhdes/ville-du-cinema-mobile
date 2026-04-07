import { memo, useState, useMemo, useCallback } from 'react'
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Review } from '@/types/database'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useTheme } from '@/contexts/ThemeContext'
import { useTabBar } from '@/contexts/TabBarContext'
import { saveRepost } from '@/services/clippings'
import { findMovieByTitle } from '@/services/tmdb'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import SwipeableRow from '@/components/ui/SwipeableRow'
import FeedDivider from '@/components/ui/FeedDivider'

interface ReviewCardProps {
  review: Review
  hideAuthor?: boolean
  /** Set to false to disable the swipe-to-repost gesture (e.g. inside RepostCard). */
  repostable?: boolean
  /** Reduces top padding — used when embedded inside a parent card (e.g. RepostCard). */
  compact?: boolean
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

function ReviewCard({ review, hideAuthor = false, repostable = true, compact = false }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { width } = useWindowDimensions()
  const [contentWidth, setContentWidth] = useState(() => width - HORIZONTAL_PAD * 2)
  const { preferences } = useDisplayPreferences()
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const { setTabBarVisible } = useTabBar()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const handleLongPress = useCallback(() => {
    if (review.review) {
      setTabBarVisible(false)
      navigation.navigate('ReviewReader', {
        reviewText: review.review,
        author: review.creator,
        username: review.username,
        movieTitle: review.movieTitle,
        rating: review.rating,
        original_url: review.link,
      })
    }
  }, [navigation, review, setTabBarVisible])

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
  }), [typography, colors])

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

  const dropCapSize = typography.title2.fontSize * 3
  const dropCapDynamicStyle = useMemo(() => ({
    fontSize: dropCapSize,
    lineHeight: dropCapSize * 1.15,
    minWidth: dropCapSize * 0.75,
  }), [dropCapSize])

  const handleRepost = useCallback(async () => {
    try {
      // Best-effort TMDB match — don't block the repost if lookup fails
      const match = await findMovieByTitle(review.movieTitle).catch(() => null)
      await saveRepost(review, match?.id ?? null)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [review])

  const renderersProps = useMemo(() => ({
    a: {
      onPress: (_event: unknown, href: string) => Linking.openURL(href),
    },
  }), [])

  const cardContent = (
    <Pressable onLongPress={handleLongPress} delayLongPress={500}>
    <View
      style={[styles.article, compact && styles.articleCompact]}
      onLayout={(e) => {
        const measured = e.nativeEvent.layout.width - HORIZONTAL_PAD * 2
        if (measured !== contentWidth) setContentWidth(measured)
      }}
    >
      {/* Title — navigates to Film Card (TMDB) */}
      <Pressable
        onPress={async () => {
          const match = await findMovieByTitle(review.movieTitle)
          if (match) {
            navigation.navigate('FilmCard', { tmdbId: match.id, movieTitle: match.title })
          } else {
            // Fallback: search on Letterboxd if TMDB has no match
            Linking.openURL(`https://letterboxd.com/search/${encodeURIComponent(review.movieTitle)}/`)
          }
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
          <Text style={styles.meta}>
            {review.creator}
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
                style={[styles.dropCapLetter, dropCapDynamicStyle]}
                selectable={false}
                suppressHighlighting
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
                  defaultTextProps={{ selectable: false, suppressHighlighting: true }}
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
              defaultTextProps={{ selectable: false, suppressHighlighting: true }}
            />
          )}
          {isLong && !expanded && (
            <Text style={[styles.expandToggle, { fontSize: typography.caption.fontSize }]}>
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
            View on Letterboxd
          </Text>
        )}
      </Pressable>

    </View>
    <FeedDivider />
    </Pressable>
  )

  if (!repostable) return cardContent

  return (
    <SwipeableRow
      onAction={handleRepost}
      actionColor={colors.teal}
      actionIcon="repeat-outline"
      actionLabel="Repost this review"
    >
      {cardContent}
    </SwipeableRow>
  )
}

export default memo(ReviewCard)

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    article: {
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    articleCompact: {
      paddingTop: spacing.sm,
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
      width: 26,
      height: 26,
      borderRadius: 13,
      marginRight: 8,
    },
    meta: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    rating: {
      color: colors.yellow,
    },
    expandToggle: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
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
      fontFamily: fonts.system,
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
  })
}
