import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useUser } from '@/hooks/useUser'
import { useProfile } from '@/hooks/useProfile'
import { colors, fonts, spacing, typography } from '@/theme'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ProfileHeader from '@/components/profile/ProfileHeader'
import FollowingList from '@/components/profile/FollowingList'

const HORIZONTAL_PAD = 20

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

      <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + insets.bottom + 20 }}>
        {profile && <ProfileHeader profile={profile} email={user.email} />}

        {/* Hairline before following */}
        <View style={styles.divider} />

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
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: typography.title3.fontSize,
    color: colors.foreground,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: HORIZONTAL_PAD,
  },
  followingSection: {
    paddingTop: spacing.xl,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  guestTitle: {
    fontFamily: fonts.heading,
    fontSize: typography.magazineTitle.fontSize,
    lineHeight: typography.magazineTitle.lineHeight,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  guestText: {
    fontFamily: fonts.body,
    fontSize: typography.magazineBody.fontSize,
    lineHeight: typography.magazineBody.lineHeight,
    color: colors.secondaryText,
    textAlign: 'center',
  },
})
