import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Animated, {
  cancelAnimation,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import LetterboxdDots from '@/components/ui/LetterboxdDots'
import ExpandableAvatar from '@/components/ui/ExpandableAvatar'
import FollowButton from '@/components/ui/FollowButton'
import type { FavoriteFilm } from '@/services/externalProfile'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'

interface ExternalProfileHeaderProps {
  displayName: string
  username: string
  bio: string
  avatarUrl?: string
  location?: string
  websiteUrl?: string
  websiteLabel?: string
  twitterHandle?: string
  twitterUrl?: string
  favoriteFilms?: FavoriteFilm[]
  isFollowing: boolean
  onFollowToggle: () => void
}

const AVATAR_SIZE = 72
const HORIZONTAL_PAD = 20
/** Strip HTML tags and decode common entities into plain text. */
function stripHtml(html: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
    '&ndash;': '\u2013', '&mdash;': '\u2014',
    '&lsquo;': '\u2018', '&rsquo;': '\u2019',
    '&ldquo;': '\u201C', '&rdquo;': '\u201D',
    '&hellip;': '\u2026',
  }
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-z]+);/gi, (match, dec, hex) => {
      if (dec) return String.fromCharCode(Number(dec))
      if (hex) return String.fromCharCode(parseInt(hex, 16))
      return entities[match] ?? match
    })
    .trim()
}

const SKELETON_DURATION = 800

function FavouritesSkeleton({
  count,
  posterWidth,
  posterHeight,
}: {
  count: number
  posterWidth: number
  posterHeight: number
}) {
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const shimmer = useSharedValue(0.06)

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.12, { duration: SKELETON_DURATION }),
        withTiming(0.06, { duration: SKELETON_DURATION }),
      ),
      -1,
    )
    return () => { cancelAnimation(shimmer) }
  }, [shimmer])

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }))

  return (
    <View style={styles.favoritesRow}>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            {
              width: posterWidth,
              height: posterHeight,
              borderRadius: 4,
              backgroundColor: colors.foreground,
            },
            skeletonStyle,
          ]}
        />
      ))}
    </View>
  )
}

export default function ExternalProfileHeader({
  displayName,
  username,
  bio,
  avatarUrl,
  location,
  websiteUrl,
  websiteLabel,
  twitterHandle,
  twitterUrl,
  favoriteFilms,
  isFollowing,
  onFollowToggle,
}: ExternalProfileHeaderProps) {
  const [bioExpanded, setBioExpanded] = useState(false)
  const { width } = useWindowDimensions()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const contentWidth = width - HORIZONTAL_PAD * 2
  const hasMetadata = !!location || !!websiteUrl || !!twitterUrl
  const posterWidth = (contentWidth - spacing.sm * 3) / 4
  const posterHeight = posterWidth * 1.5
  const letterboxdUrl = `https://letterboxd.com/${username}/`

  // Track poster loading globally — skeleton stays until every poster is ready
  const totalPosters = favoriteFilms?.length ?? 0
  const loadedCount = useRef(0)
  const [allPostersLoaded, setAllPostersLoaded] = useState(false)
  const postersOpacity = useSharedValue(0)

  const handlePosterLoad = useCallback(() => {
    loadedCount.current += 1
    if (loadedCount.current >= totalPosters) {
      setAllPostersLoaded(true)
      postersOpacity.value = withTiming(1, { duration: 300 })
    }
  }, [totalPosters, postersOpacity])

  const postersAnimStyle = useAnimatedStyle(() => ({
    opacity: postersOpacity.value,
  }))

  const plainBio = useMemo(() => stripHtml(bio), [bio])
  const bioParagraphs = useMemo(() => plainBio.split(/\n\n+/), [plainBio])
  const hasMoreParagraphs = bioParagraphs.length > 1
  const remainingText = useMemo(
    () => bioParagraphs.slice(1).join('\n\n'),
    [bioParagraphs],
  )

  const expandBio = useCallback(() => {
    if (!hasMoreParagraphs || bioExpanded) return
    setBioExpanded(true)
  }, [hasMoreParagraphs, bioExpanded])

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <ExpandableAvatar
          avatarUrl={avatarUrl}
          displayName={displayName}
          username={username}
          size={AVATAR_SIZE}
        />
      </View>

      {/* Display name */}
      <Pressable
        style={styles.displayNameRow}
        onPress={() => Linking.openURL(letterboxdUrl)}
      >
        <Text style={styles.displayName}>{displayName}</Text>
        <View style={styles.dotsOffset}>
          <LetterboxdDots size={16} />
        </View>
      </Pressable>

      {/* @username */}
      <Text
        style={styles.username}
        onPress={() => Linking.openURL(letterboxdUrl)}
        suppressHighlighting
      >
        @{username}
      </Text>

      {/* Bio */}
      {bio ? (
        <Pressable
          style={styles.bioWrapper}
          onPress={expandBio}
          disabled={!hasMoreParagraphs || bioExpanded}
        >
          <Text style={styles.bioText}>{bioParagraphs[0]}</Text>
          {bioExpanded && remainingText ? (
            <Animated.View
              entering={FadeInUp.duration(300).delay(120)}
            >
              <Text style={[styles.bioText, styles.bioRemainder]}>
                {remainingText}
              </Text>
            </Animated.View>
          ) : null}
          {!bioExpanded && hasMoreParagraphs ? (
            <Animated.Text
              exiting={FadeOut.duration(120)}
              style={styles.readMoreText}
            >
              Read More
            </Animated.Text>
          ) : null}
        </Pressable>
      ) : null}

      {/* Metadata row */}
      {hasMetadata ? (
        <View style={styles.metadataRow}>
          {location ? (
            <View style={styles.metadataItem}>
              <Ionicons name="location-sharp" size={14} color={colors.secondaryText} />
              <Text style={styles.metadataLabel}>{location}</Text>
            </View>
          ) : null}

          {websiteUrl ? (
            <Pressable
              style={styles.metadataItem}
              onPress={() => WebBrowser.openBrowserAsync(websiteUrl)}
            >
              <Ionicons name="globe-outline" size={14} color={colors.teal} />
              <Text style={styles.metadataLink}>{websiteLabel || websiteUrl}</Text>
            </Pressable>
          ) : null}

          {twitterUrl ? (
            <Pressable
              style={styles.metadataItem}
              onPress={() => Linking.openURL(twitterUrl)}
            >
              <Text style={styles.xLogo}>{'\u{1D54F}'}</Text>
              <Text style={styles.metadataLink}>{twitterHandle || 'X'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Favourites */}
      {favoriteFilms && favoriteFilms.length > 0 ? (
        <View style={styles.favoritesSection}>
          {/* Skeleton — overlays posters until all have loaded */}
          {!allPostersLoaded ? (
            <View style={styles.skeletonOverlay}>
              <FavouritesSkeleton
                count={favoriteFilms.length}
                posterWidth={posterWidth}
                posterHeight={posterHeight}
              />
            </View>
          ) : null}

          {/* Real posters — always in layout, fade in once all loaded */}
          <Animated.View style={[styles.favoritesRow, postersAnimStyle]}>
            {favoriteFilms.map((film, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  const query = encodeURIComponent(`${film.title} film`)
                  WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${query}`)
                }}
                style={({ pressed }) => pressed && styles.posterPressed}
              >
                <Image
                  source={{ uri: film.posterUrl }}
                  style={{
                    width: posterWidth,
                    height: posterHeight,
                    borderRadius: 4,
                  }}
                  cachePolicy="memory-disk"
                  accessibilityLabel={film.title}
                  onLoad={handlePosterLoad}
                />
              </Pressable>
            ))}
          </Animated.View>
        </View>
      ) : null}

      {/* Follow / Following */}
      <FollowButton
        isFollowing={isFollowing}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onFollowToggle()
        }}
        style={styles.followButtonMargin}
      />

      {/* Bottom hairline divider */}
      <View style={styles.divider} />
    </View>
  )
}

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: spacing.xl,
    },
    avatarWrapper: {
      marginBottom: spacing.md,
    },
    displayNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dotsOffset: {
      marginTop: 2,
    },
    displayName: {
      fontFamily: fonts.heading,
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
      color: colors.foreground,
      textAlign: 'center',
    },
    username: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 2,
    },
    bioWrapper: {
      alignSelf: 'stretch',
      marginTop: spacing.lg,
    },
    bioText: {
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.foreground,
      textAlign: 'center',
    },
    readMoreText: {
      textAlign: 'center',
      marginTop: spacing.xs,
      fontFamily: fonts.system,
      fontStyle: 'italic' as const,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.secondaryText,
      letterSpacing: 0.3,
    },
    bioRemainder: {
      marginTop: spacing.sm,
    },
    metadataRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    metadataItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metadataLabel: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
    },
    xLogo: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: colors.teal,
    },
    metadataLink: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.teal,
    },
    favoritesSection: {
      alignSelf: 'stretch',
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    favoritesRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    skeletonOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    posterPressed: {
      opacity: 0.6,
    },
    followButtonMargin: {
      marginTop: spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      alignSelf: 'stretch',
      marginTop: spacing.xl,
    },
  })
}
