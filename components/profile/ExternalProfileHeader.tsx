import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
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
  const hasMetadata = !!location || !!websiteUrl || !!twitterUrl
  const letterboxdUrl = `https://letterboxd.com/${username}/`

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
      {bio ? <Text style={styles.bio}>{bio}</Text> : null}

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
              <Ionicons name="logo-twitter" size={14} color={colors.teal} />
              <Text style={styles.metadataLink}>{twitterHandle || 'Twitter'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* View on Letterboxd link */}
      <Pressable onPress={() => Linking.openURL(letterboxdUrl)}>
        <Text style={styles.letterboxdLink}>View on Letterboxd</Text>
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
  bio: {
    fontFamily: fonts.bodyItalic,
    fontSize: typography.magazineBody.fontSize,
    lineHeight: typography.magazineBody.lineHeight,
    color: colors.foreground,
    textAlign: 'center',
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
  metadataLink: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.teal,
  },
  letterboxdLink: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.teal,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
})
