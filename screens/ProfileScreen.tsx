import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@/hooks/useUser'
import { useProfile } from '@/hooks/useProfile'
import { colors, fonts, spacing } from '@/theme'
import SectionHeader from '@/components/ui/SectionHeader'
import Divider from '@/components/ui/Divider'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ProfileHeader from '@/components/profile/ProfileHeader'
import FollowingList from '@/components/profile/FollowingList'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { profile, isLoading, error } = useProfile()

  // Guest mode — prompt to sign in
  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <SectionHeader title="PROFILE" />
        <View style={styles.guestContainer}>
          <Text style={styles.guestTitle}>GUEST MODE</Text>
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
        <SectionHeader title="MY PROFILE" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.black} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SectionHeader title="MY PROFILE" />

      {error && <ErrorBanner message={error} />}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Name + username */}
        <View style={styles.nameSection}>
          {profile?.display_name && (
            <Text style={styles.displayName}>{profile.display_name}</Text>
          )}
          {profile?.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          <Text style={styles.email}>{user.email}</Text>
        </View>

        {profile && <ProfileHeader profile={profile} />}

        <Divider />

        {profile && <FollowingList users={profile.followed_users} />}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  displayName: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.black,
  },
  username: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.sepia,
    marginTop: spacing.xs,
  },
  email: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.sepiaLight,
    marginTop: spacing.xs,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  guestTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.black,
    letterSpacing: 3,
    marginBottom: spacing.md,
  },
  guestText: {
    fontFamily: fonts.bodyItalic,
    fontSize: 16,
    color: colors.sepia,
    textAlign: 'center',
    lineHeight: 24,
  },
})
