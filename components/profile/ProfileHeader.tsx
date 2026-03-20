import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { UserProfile } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import ExpandableAvatar from '@/components/ui/ExpandableAvatar'

interface ProfileHeaderProps {
  profile: UserProfile
  email?: string
  showEdit?: boolean
}

const AVATAR_SIZE = 72
const HORIZONTAL_PAD = 20

export default function ProfileHeader({ profile, email, showEdit }: ProfileHeaderProps) {
  const { colors } = useTheme()
  const typography = useTypography()
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  return (
    <View style={styles.container}>
      {/* Avatar + identity row */}
      <View style={styles.row}>
        <View style={styles.avatarContainer}>
          <ExpandableAvatar
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            username={profile.username}
            email={email}
            size={AVATAR_SIZE}
          />
        </View>

        <View style={styles.identity}>
          {profile.display_name ? (
            <Text style={styles.displayName}>{profile.display_name}</Text>
          ) : null}
          {profile.username ? (
            <Text style={styles.meta}>@{profile.username}</Text>
          ) : null}
          {email ? (
            <Text style={styles.meta}>{email}</Text>
          ) : null}

          {showEdit ? (
            <Pressable
              style={styles.editButton}
              onPress={() => navigation.navigate('EditProfile')}
              hitSlop={8}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Bio or onboarding nudge */}
      {profile.bio ? (
        <Text style={styles.bioText}>{profile.bio}</Text>
      ) : showEdit ? (
        <Text style={styles.nudgeText}>Tap Edit to set up your profile.</Text>
      ) : null}
    </View>
  )
}

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
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
      fontFamily: fonts.system,
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
      fontFamily: fonts.system,
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
    nudgeText: {
      fontFamily: fonts.bodyItalic,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      marginTop: spacing.lg,
    },
  })
}
