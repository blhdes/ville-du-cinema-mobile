import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useUser } from '@/hooks/useUser'
import { useProfile } from '@/hooks/useProfile'
import { colors, fonts, spacing, typography } from '@/theme'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ProfileHeader from '@/components/profile/ProfileHeader'
import FollowingList from '@/components/profile/FollowingList'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { user } = useUser()
  const { profile, isLoading, error } = useProfile()

  // Guest mode — prompt to sign in
  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.guestContainer}>
          <Text style={styles.guestTitle}>Guest Mode</Text>
          <Text style={styles.guestText}>
            Sign in to access your profile, sync your followed users across devices, and customize your display preferences.
          </Text>
        </View>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondaryText} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {error && <ErrorBanner message={error} />}

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}>
        {profile && <ProfileHeader profile={profile} />}

        {/* Name & info */}
        <View style={styles.nameSection}>
          {profile?.display_name && (
            <Text style={styles.displayName}>{profile.display_name}</Text>
          )}
          {profile?.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          <Text style={styles.email}>{user.email}</Text>
        </View>

        {profile && (
          <View style={styles.followingSection}>
            <FollowingList users={profile.followed_users} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: typography.title3.fontSize,
    color: colors.foreground,
  },
  content: {},
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  displayName: {
    fontFamily: fonts.heading,
    fontSize: typography.title2.fontSize,
    lineHeight: typography.title2.lineHeight,
    color: colors.foreground,
  },
  username: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.secondaryText,
    marginTop: spacing.xs,
  },
  email: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    color: colors.secondaryText,
    marginTop: spacing.xs,
  },
  followingSection: {
    paddingTop: spacing.sm,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  guestTitle: {
    fontFamily: fonts.heading,
    fontSize: typography.title2.fontSize,
    lineHeight: typography.title2.lineHeight,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  guestText: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.secondaryText,
    textAlign: 'center',
  },
})
