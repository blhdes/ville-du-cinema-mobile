import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Animated, {
  cancelAnimation,
  interpolateColor,
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
import type { FavoriteFilm } from '@/services/externalProfile'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'

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
const FOLLOW_DURATION = 250
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

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
  const styles = useMemo(() => createStyles(colors), [colors])
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

function FollowButton({ isFollowing, onPress }: { isFollowing: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const progress = useSharedValue(isFollowing ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(isFollowing ? 1 : 0, { duration: FOLLOW_DURATION })
  }, [isFollowing, progress])

  const buttonStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, 'transparent'],
    ),
  }))

  // Crossfade: FOLLOW fades out while FOLLOWING fades in
  const followOpacity = useAnimatedStyle(() => ({ opacity: 1 - progress.value }))
  const followingOpacity = useAnimatedStyle(() => ({ opacity: progress.value }))

  const followColor = useAnimatedStyle(() => ({
    color: colors.foreground,
  }))
  const followingColor = useAnimatedStyle(() => ({
    color: colors.secondaryText,
  }))

  return (
    <AnimatedPressable
      style={[styles.followButton, buttonStyle]}
      onPress={onPress}
    >
      <View style={styles.followTextContainer}>
        {/* FOLLOWING sits in normal flow to size the container (it's the longer label) */}
        <Animated.Text style={[styles.followText, followingColor, followingOpacity]}>
          FOLLOWING
        </Animated.Text>
        {/* FOLLOW overlays on top, centered */}
        <Animated.Text style={[styles.followText, styles.followTextOverlay, followColor, followOpacity]}>
          FOLLOW
        </Animated.Text>
      </View>
    </AnimatedPressable>
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
  const [avatarOpen, setAvatarOpen] = useState(false)
  const { width } = useWindowDimensions()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
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
        {avatarUrl ? (
          <Pressable onPress={() => setAvatarOpen(true)}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} cachePolicy="memory-disk" />
          </Pressable>
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(displayName || username || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Enlarged avatar modal — overlay stays dark (photo context, not themed) */}
      {avatarUrl ? (
        <Modal
          visible={avatarOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAvatarOpen(false)}
        >
          <Pressable style={styles.avatarOverlay} onPress={() => setAvatarOpen(false)}>
            <Image
              source={{ uri: avatarUrl }}
              style={[styles.avatarEnlarged, { width: width * 0.6, height: width * 0.6 }]}
              cachePolicy="memory-disk"
            />
            <Text style={styles.avatarOverlayName}>{displayName}</Text>
          </Pressable>
        </Modal>
      ) : null}

      {/* Display name */}
      <Text style={styles.displayName}>{displayName}</Text>

      {/* @USERNAME */}
      <Text style={styles.username}>@{username.toUpperCase()}</Text>

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
          <Text style={styles.favoritesLabel}>FAVOURITES</Text>

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
      <FollowButton isFollowing={isFollowing} onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onFollowToggle()
      }} />

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: spacing.xl,
    },
    avatarWrapper: {
      marginBottom: spacing.md,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
    },
    avatarOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEnlarged: {
      borderRadius: 9999,
    },
    avatarOverlayName: {
      fontFamily: fonts.heading,
      fontSize: typography.title1.fontSize,
      color: colors.white,
      marginTop: spacing.lg,
      textAlign: 'center',
    },
    avatarPlaceholder: {
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: colors.secondaryText,
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
    favoritesLabel: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
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
    followButton: {
      marginTop: spacing.md,
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 4,
      backgroundColor: 'transparent',
    },
    followTextContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    followText: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
    },
    followTextOverlay: {
      position: 'absolute',
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
