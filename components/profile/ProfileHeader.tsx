import { useMemo } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import type { UserProfile } from '@/types/database'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'

interface ProfileHeaderProps {
  profile: UserProfile
  email?: string
}

const AVATAR_SIZE = 72
const HORIZONTAL_PAD = 20

export default function ProfileHeader({ profile, email }: ProfileHeaderProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      {/* Avatar + identity row */}
      <View style={styles.row}>
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(profile.display_name || profile.username || '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.identity}>
          {profile.display_name ? (
            <Text style={styles.displayName}>{profile.display_name}</Text>
          ) : null}
          {profile.username ? (
            <Text style={styles.meta}>@{profile.username.toUpperCase()}</Text>
          ) : null}
          {email ? (
            <Text style={styles.meta}>{email.toUpperCase()}</Text>
          ) : null}
        </View>
      </View>

      {/* Bio */}
      {profile.bio ? (
        <Text style={styles.bioText}>{profile.bio}</Text>
      ) : null}
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      marginRight: spacing.md,
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
    identity: {
      flex: 1,
    },
    displayName: {
      fontFamily: fonts.heading,
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
      color: colors.foreground,
      marginBottom: spacing.xs,
    },
    meta: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      marginTop: 2,
    },
    bioText: {
      fontFamily: fonts.bodyItalic,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
      marginTop: spacing.lg,
    },
  })
}
