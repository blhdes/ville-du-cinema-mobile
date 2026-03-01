import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@/hooks/useUser'
import { useGuestMode } from '@/contexts/GuestModeContext'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { colors, fonts, spacing } from '@/theme'
import SectionHeader from '@/components/ui/SectionHeader'
import Divider from '@/components/ui/Divider'
import DisplaySettings from '@/components/settings/DisplaySettings'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { user, signOut } = useUser()
  const { isGuest, exitGuestMode } = useGuestMode()
  const {
    preferences,
    isAuthenticated,
    setHideUserlistMain,
    setFeedGridColumns,
    setHideWatchNotifications,
  } = useDisplayPreferences()

  const handleSignOut = async () => {
    if (user) await signOut()
    if (isGuest) await exitGuestMode()
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SectionHeader title="SETTINGS" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>
              {user ? 'Signed in' : 'Guest mode'}
            </Text>
          </View>
          {user && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          )}
        </View>

        <Divider />

        {/* Display preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DISPLAY</Text>
          <DisplaySettings
            hideUserlistMain={preferences.hideUserlistMain}
            feedGridColumns={preferences.feedGridColumns}
            hideWatchNotifications={preferences.hideWatchNotifications}
            onSetHideUserlistMain={setHideUserlistMain}
            onSetFeedGridColumns={setFeedGridColumns}
            onSetHideWatchNotifications={setHideWatchNotifications}
            disabled={!isAuthenticated}
          />
          {!isAuthenticated && (
            <Text style={styles.disabledNote}>
              Sign in to save display preferences
            </Text>
          )}
        </View>

        <Divider />

        {/* Sign out / Exit */}
        <View style={styles.signOutSection}>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>
              {user ? 'SIGN OUT' : 'EXIT GUEST MODE'}
            </Text>
          </Pressable>
        </View>
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
  section: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.sepia,
    letterSpacing: 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.black,
  },
  infoValue: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.sepia,
  },
  disabledNote: {
    fontFamily: fonts.bodyItalic,
    fontSize: 13,
    color: colors.sepia,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  signOutSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: colors.red,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderWidth: 2,
    borderColor: colors.black,
  },
  signOutText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.white,
    letterSpacing: 2,
  },
})
