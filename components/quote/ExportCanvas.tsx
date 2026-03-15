import { forwardRef, useMemo } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Image } from 'expo-image'
import ViewShot from 'react-native-view-shot'
import { useTheme } from '@/contexts/ThemeContext'
import LogoIcon from '@/components/ui/LogoIcon'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { fonts, spacing, typography } from '@/theme'

interface ExportCanvasProps {
  quote: string
  author: string
  username: string
  avatarUrl?: string
  movieTitle: string
  rating: string
}

/** Slightly reduce font size for longer quotes so the card stays compact. */
function getQuoteFontSize(length: number): { fontSize: number; lineHeight: number } {
  if (length > 400) return { fontSize: 14, lineHeight: 22 }
  if (length > 250) return { fontSize: 15, lineHeight: 23 }
  return { fontSize: typography.magazineBody.fontSize, lineHeight: typography.magazineBody.lineHeight }
}

const AVATAR_SIZE = 28
const BRAND_ICON_SIZE = 44

/**
 * Premium quote card captured by ViewShot.
 * Magazine-style layout with author avatar, @handle, and app branding.
 */
const ExportCanvas = forwardRef<ViewShot, ExportCanvasProps>(
  ({ quote, author, username, avatarUrl, movieTitle, rating }, ref) => {
    const { colors } = useTheme()
    const { preferences } = useDisplayPreferences()
    const { width: screenWidth } = useWindowDimensions()

    const cardWidth = Math.round(screenWidth * 0.85)
    const quoteFontStyle = useMemo(() => getQuoteFontSize(quote.length), [quote.length])

    return (
      <ViewShot
        ref={ref}
        options={{ format: 'png', quality: 1 }}
        style={[
          styles.card,
          {
            width: cardWidth,
            backgroundColor: colors.backgroundSecondary,
          },
        ]}
      >
        {/* ── Top row: Author + Logo ── */}
        <View style={styles.topRow}>
          <View style={styles.authorRow}>
            {avatarUrl ? (
            <Image
              source={avatarUrl}
              style={[styles.avatar, { borderColor: colors.border }]}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.border }]}>
              <Text style={[styles.avatarInitial, { color: colors.secondaryText }]}>
                {author.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: colors.foreground }]} numberOfLines={1}>
              {author}
            </Text>
            <Text style={[styles.handle, { color: colors.secondaryText }]} numberOfLines={1}>
              @{username}
            </Text>
          </View>
        </View>
          <LogoIcon size={BRAND_ICON_SIZE} fill={colors.foreground} />
        </View>

        {/* ── Hairline divider ── */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ── Quote body ── */}
        <Text style={[styles.quoteText, quoteFontStyle, { color: colors.foreground }]}>
          {quote}
        </Text>

        {/* ── Movie title + rating ── */}
        <Text style={[styles.movieTitle, { color: colors.secondaryText }]}>
          {movieTitle.toUpperCase()}
          {rating && preferences.showRatings ? `  ${rating}` : ''}
        </Text>
      </ViewShot>
    )
  },
)

ExportCanvas.displayName = 'ExportCanvas'
export default ExportCanvas

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // ── Top row ──
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 15,
  },
  authorInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  authorName: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.callout.fontSize,
    lineHeight: typography.callout.lineHeight,
  },
  handle: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },

  // ── Divider ──
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },

  // ── Quote body ──
  quoteText: {
    fontFamily: fonts.body,
    marginBottom: spacing.md,
  },

  // ── Movie title ──
  movieTitle: {
    fontFamily: fonts.body,
    fontSize: typography.magazineMeta.fontSize,
    lineHeight: typography.magazineMeta.lineHeight,
    letterSpacing: typography.magazineMeta.letterSpacing,
  },
})
