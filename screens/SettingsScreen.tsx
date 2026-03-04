import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useUser } from '@/hooks/useUser'
import { useGuestMode } from '@/contexts/GuestModeContext'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { colors, fonts, spacing, typography } from '@/theme'
import DisplaySettings from '@/components/settings/DisplaySettings'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { user, signOut } = useUser()
  const { isGuest, exitGuestMode } = useGuestMode()
  const {
    preferences,
    isAuthenticated,
    setHideWatchNotifications,
    setUseDropCap,
    setHideRatings,
  } = useDisplayPreferences()

  const handleSignOut = async () => {
    if (user) await signOut()
    if (isGuest) await exitGuestMode()
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}>
        {/* Account section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Status</Text>
            <Text style={styles.rowValue}>
              {user ? 'Signed in' : 'Guest mode'}
            </Text>
          </View>
          {user && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={[styles.rowValue, styles.rowValueFlex]} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          )}
        </View>

        {/* Display preferences */}
        <Text style={styles.sectionLabel}>Display</Text>
        <View style={styles.cardWrapper}>
          <DisplaySettings
            hideWatchNotifications={preferences.hideWatchNotifications}
            useDropCap={preferences.useDropCap}
            hideRatings={preferences.hideRatings}
            onSetHideWatchNotifications={setHideWatchNotifications}
            onSetUseDropCap={setUseDropCap}
            onSetHideRatings={setHideRatings}
            disableRemote={!isAuthenticated}
          />
        </View>
        {!isAuthenticated && (
          <Text style={styles.sectionFooter}>
            Sign in to save display preferences across devices.
          </Text>
        )}

        {/* Sign out */}
        <View style={styles.signOutSection}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => pressed && styles.signOutPressed}
          >
            <Text style={styles.signOutText}>
              {user ? 'Sign Out' : 'Exit Guest Mode'}
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
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionFooter: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    color: colors.secondaryText,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardWrapper: {
    marginHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.foreground,
  },
  rowValue: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.secondaryText,
  },
  rowValueFlex: {
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  signOutSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  signOutText: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
  signOutPressed: {
    opacity: 0.6,
  },
})
