import { useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
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
  const { width } = useWindowDimensions()
  const contentWidth = width - HORIZONTAL_PAD * 2
  const hasMetadata = !!location || !!websiteUrl || !!twitterUrl
  const letterboxdUrl = `https://letterboxd.com/${username}/`

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
      textDecorationLine: 'underline' as const,
    },
    i: { fontFamily: fonts.bodyItalic, fontStyle: 'normal' as const },
    em: { fontFamily: fonts.bodyItalic, fontStyle: 'normal' as const },
    b: { fontFamily: fonts.bodyBold, fontWeight: 'normal' as const },
    strong: { fontFamily: fonts.bodyBold, fontWeight: 'normal' as const },
  }), [])

  const bioRenderersProps = useMemo(() => ({
    a: {
      onPress: (_event: unknown, href: string) => Linking.openURL(href),
    },
  }), [])

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(displayName || username || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Display name */}
      <Text style={styles.displayName}>{displayName}</Text>

      {/* @USERNAME */}
      <Text style={styles.username}>@{username.toUpperCase()}</Text>

      {/* Bio */}
      {bio ? (
        <View style={styles.bioWrapper}>
          <RenderHtml
            contentWidth={contentWidth}
            source={{ html: bio }}
            tagsStyles={bioTagsStyles}
            systemFonts={SYSTEM_FONTS}
            renderersProps={bioRenderersProps}
          />
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
              onPress={() => Linking.openURL(websiteUrl)}
            >
              <Ionicons name="link" size={14} color={colors.teal} />
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
