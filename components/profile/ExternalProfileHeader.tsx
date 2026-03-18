import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Animated, {
  cancelAnimation,
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
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html'
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
// 8 lines of magazineBody (lineHeight 24) = 192px
const BIO_COLLAPSED_HEIGHT = 192
const SYSTEM_FONTS = [
  ...defaultSystemFonts,
  fonts.heading,
  fonts.body,
  fonts.bodyBold,
  fonts.bodyItalic,
]

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
  const [bioOverflows, setBioOverflows] = useState(false)
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

  const handleBioLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    if (!bioExpanded && e.nativeEvent.layout.height > BIO_COLLAPSED_HEIGHT) {
      setBioOverflows(true)
    }
  }, [bioExpanded])

  const bioTagsStyles = useMemo(() => ({
    body: {
      fontFamily: fonts.body,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
      textAlign: 'center' as const,
    },
    p: {
      marginTop: 0,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    a: {
      fontFamily: fonts.body,
      color: colors.teal,
      textDecorationLine: 'none' as const,
    },
    i: { fontFamily: fonts.bodyItalic, fontStyle: 'normal' as const },
    em: { fontFamily: fonts.bodyItalic, fontStyle: 'normal' as const },
    b: { fontFamily: fonts.bodyBold, fontWeight: 'normal' as const },
    strong: { fontFamily: fonts.bodyBold, fontWeight: 'normal' as const },
  }), [colors])

  const bioRenderersProps = useMemo(() => ({
    a: {
      onPress: (_event: unknown, href: string) => WebBrowser.openBrowserAsync(href),
    },
  }), [])

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
      <Text style={styles.displayName}>{displayName}</Text>

      {/* @username */}
      <Text style={styles.username}>@{username}</Text>

      {/* Bio */}
      {bio ? (
        <View style={styles.bioWrapper}>
          <View
            style={
              !bioExpanded && bioOverflows
                ? { maxHeight: BIO_COLLAPSED_HEIGHT, overflow: 'hidden' as const }
                : undefined
            }
          >
            <View onLayout={handleBioLayout}>
              <RenderHtml
                contentWidth={contentWidth}
                source={{ html: bio }}
                tagsStyles={bioTagsStyles}
                systemFonts={SYSTEM_FONTS}
                renderersProps={bioRenderersProps}
              />
            </View>
          </View>

          {/* Fade overlay at bottom of clamped bio */}
          {!bioExpanded && bioOverflows ? (
            <View style={styles.bioFade} pointerEvents="none">
              <View style={[styles.bioFadeStep, { opacity: 0 }]} />
              <View style={[styles.bioFadeStep, { opacity: 0.4 }]} />
              <View style={[styles.bioFadeStep, { opacity: 0.7 }]} />
              <View style={[styles.bioFadeStep, { opacity: 0.95 }]} />
            </View>
          ) : null}

          {/* Editorial Read More */}
          {!bioExpanded && bioOverflows ? (
            <Pressable
              style={styles.readMoreButton}
              onPress={() => setBioExpanded(true)}
              hitSlop={12}
            >
              <Text style={styles.readMoreText}>Read More</Text>
            </Pressable>
          ) : null}
        </View>
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

      {/* Letterboxd link */}
      <Pressable
        style={styles.letterboxdButton}
        onPress={() => Linking.openURL(letterboxdUrl)}
      >
        <LetterboxdDots size={20} />
      </Pressable>

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
    displayName: {
      fontFamily: fonts.heading,
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
      color: colors.foreground,
      textAlign: 'center',
    },
    username: {
      fontFamily: fonts.body,
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
    bioFade: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 32,
      flexDirection: 'column',
    },
    bioFadeStep: {
      flex: 1,
      backgroundColor: colors.background,
    },
    readMoreButton: {
      alignItems: 'center',
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    readMoreText: {
      fontFamily: fonts.bodyItalic,
      fontStyle: 'normal',
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.secondaryText,
      letterSpacing: 0.3,
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
      fontFamily: fonts.body,
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
      fontFamily: fonts.body,
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
    letterboxdButton: {
      marginTop: spacing.md,
      padding: spacing.sm,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      alignSelf: 'stretch',
      marginTop: spacing.xl,
    },
  })
}
