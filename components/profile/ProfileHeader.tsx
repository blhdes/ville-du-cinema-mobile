import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { UserProfile } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'

interface ProfileHeaderProps {
  profile: UserProfile
  email?: string
  showEdit?: boolean
}

const AVATAR_SIZE = 72
const HORIZONTAL_PAD = 20

export default function ProfileHeader({ profile, email, showEdit }: ProfileHeaderProps) {
  const { colors } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      {/* Avatar + identity row */}
      <View style={styles.row}>
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} cachePolicy="memory-disk" />
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

          {showEdit ? (
            <Pressable
              style={styles.editButton}
              onPress={() => navigation.navigate('EditProfile')}
              hitSlop={8}
            >
              <Text style={styles.editButtonText}>EDIT</Text>
            </Pressable>
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
    editButton: {
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    editButtonText: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
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
