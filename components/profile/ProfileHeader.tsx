import { Image, StyleSheet, Text, View } from 'react-native'
import type { UserProfile } from '@/types/database'
import { colors, fonts, spacing, typography } from '@/theme'

interface ProfileHeaderProps {
  profile: UserProfile
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Avatar */}
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

      {/* Bio */}
      {profile.bio ? (
        <Text style={styles.bioText}>{profile.bio}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    fontSize: 40,
    color: colors.secondaryText,
  },
  bioText: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.foreground,
    textAlign: 'center',
  },
})
