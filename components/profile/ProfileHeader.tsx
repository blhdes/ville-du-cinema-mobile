import { Image, StyleSheet, Text, View } from 'react-native'
import type { UserProfile } from '@/types/database'
import { colors, fonts, spacing, common } from '@/theme'

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
        <View style={styles.bioBox}>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
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
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: colors.black,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    fontSize: 48,
    color: colors.sepia,
  },
  bioBox: {
    width: '100%',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.sepiaLight,
  },
  bioText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.black,
    lineHeight: 22,
    textAlign: 'center',
  },
})
