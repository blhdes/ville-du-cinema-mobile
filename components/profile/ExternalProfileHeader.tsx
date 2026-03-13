import { useCallback, useMemo, useState } from 'react'
import { Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html'
import LetterboxdDots from '@/components/ui/LetterboxdDots'
import { colors, fonts, spacing, typography } from '@/theme'

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
}: ExternalProfileHeaderProps) {
  const [bioExpanded, setBioExpanded] = useState(false)
  const [bioOverflows, setBioOverflows] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const { width } = useWindowDimensions()
  const contentWidth = width - HORIZONTAL_PAD * 2
  const hasMetadata = !!location || !!websiteUrl || !!twitterUrl
  const letterboxdUrl = `https://letterboxd.com/${username}/`

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
  }), [])

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
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          </Pressable>
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(displayName || username || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Enlarged avatar modal */}
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
              <Text style={styles.xLogo}>𝕏</Text>
              <Text style={styles.metadataLink}>{twitterHandle || 'X'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Letterboxd link */}
      <Pressable
        style={styles.letterboxdButton}
        onPress={() => Linking.openURL(letterboxdUrl)}
      >
        <LetterboxdDots size={20} fill={colors.teal} />
      </Pressable>

      {/* Bottom hairline divider */}
      <View style={styles.divider} />
    </View>
  )
}

const styles = StyleSheet.create({
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
