import { useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { UserProfile, VillagePublicProfile } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import ExpandableAvatar from '@/components/ui/ExpandableAvatar'
import LetterboxdDots from '@/components/ui/LetterboxdDots'

interface ProfileHeaderProps {
  profile: UserProfile | VillagePublicProfile
  email?: string
  showEdit?: boolean
  followingCount?: number
  onFollowingPress?: () => void
}

const AVATAR_SIZE = 72
const HORIZONTAL_PAD = 20

export default function ProfileHeader({ profile, email, showEdit, followingCount, onFollowingPress }: ProfileHeaderProps) {
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

          {(showEdit || followingCount !== undefined) && (
            <View style={styles.actionsRow}>
              {showEdit ? (
                <Pressable
                  style={styles.editButton}
                  onPress={() => navigation.navigate('EditProfile')}
                  hitSlop={8}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
              ) : null}

              {followingCount !== undefined && (
                onFollowingPress ? (
                  <Pressable
                    style={({ pressed }) => [styles.followingRow, pressed && styles.followingPressed]}
                    onPress={onFollowingPress}
                    hitSlop={8}
                  >
                    <Text style={styles.followingLabel}>Following</Text>
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>{followingCount}</Text>
                    </View>
                  </Pressable>
                ) : (
                  <View style={styles.followingRow}>
                    <Text style={styles.followingLabel}>Following</Text>
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>{followingCount}</Text>
                    </View>
                  </View>
                )
              )}
            </View>
          )}
        </View>
      </View>

      {/* Bio or onboarding nudge */}
      {profile.bio ? (
        <Text style={styles.bioText}>{profile.bio}</Text>
      ) : showEdit ? (
        <Text style={styles.nudgeText}>Tap Edit to set up your profile.</Text>
      ) : null}

      {/* Metadata row — location, website, X, Letterboxd */}
      {(profile.location || profile.website_url || profile.twitter_handle || profile.letterboxd_username) ? (
        <View style={styles.metadataRow}>
          {profile.location ? (
            <View style={styles.metadataItem}>
              <Ionicons name="location-sharp" size={13} color={colors.secondaryText} />
              <Text style={styles.metadataLabel}>{profile.location}</Text>
            </View>
          ) : null}

          {profile.website_url ? (
            <Pressable
              style={styles.metadataItem}
              onPress={() => WebBrowser.openBrowserAsync(profile.website_url!)}
              hitSlop={4}
            >
              <Ionicons name="globe-outline" size={13} color={colors.teal} />
              <Text style={styles.metadataLink}>
                {profile.website_label || profile.website_url}
              </Text>
            </Pressable>
          ) : null}

          {profile.twitter_handle ? (
            <Pressable
              style={styles.metadataItem}
              onPress={() => Linking.openURL(`https://x.com/${profile.twitter_handle}`)}
              hitSlop={4}
            >
              <Text style={[styles.xLogo, { color: colors.teal }]}>{'\u{1D54F}'}</Text>
              <Text style={styles.metadataLink}>@{profile.twitter_handle}</Text>
            </Pressable>
          ) : null}

          {profile.letterboxd_username ? (
            <Pressable
              style={styles.metadataItem}
              onPress={() => Linking.openURL(`https://letterboxd.com/${profile.letterboxd_username}/`)}
              hitSlop={4}
            >
              <LetterboxdDots size={14} />
              <Text style={styles.metadataLink}>{profile.letterboxd_username}</Text>
            </Pressable>
          ) : null}
        </View>
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
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    followingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    followingLabel: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    countPill: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    countPillText: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
    },
    followingPressed: {
      opacity: 0.6,
    },
    metadataRow: {
      flexDirection: 'row',
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
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
    },
    metadataLink: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.teal,
    },
    xLogo: {
      fontSize: 13,
      fontWeight: '700' as const,
    },
  })
}
