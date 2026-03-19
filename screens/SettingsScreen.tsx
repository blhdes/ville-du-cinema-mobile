import { useCallback, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@/hooks/useUser'
import { useGuestMode } from '@/contexts/GuestModeContext'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import DisplaySettings from '@/components/settings/DisplaySettings'
import SettingsSkeleton from '@/components/settings/SettingsSkeleton'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { user, isLoading: isAuthLoading, signOut } = useUser()
  const { isGuest, exitGuestMode } = useGuestMode()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const {
    preferences,
    isLoading: isPrefsLoading,
    isAuthenticated,
    setShowWatchNotifications,
    setUseDropCap,
    setShowRatings,
    setFontMultiplier,
  } = useDisplayPreferences()

  const isLoading = isAuthLoading || isPrefsLoading

  const handleSignOut = useCallback(async () => {
    if (user) await signOut()
    if (isGuest) await exitGuestMode()
  }, [user, isGuest, signOut, exitGuestMode])

  const scrollContentStyle = useMemo(
    () => [styles.content, { paddingBottom: insets.bottom + 49 + 20 }],
    [styles, insets.bottom],
  )

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {isLoading ? (
        <SettingsSkeleton />
      ) : (
        <ScrollView contentContainerStyle={scrollContentStyle}>
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
              showWatchNotifications={preferences.showWatchNotifications}
              useDropCap={preferences.useDropCap}
              showRatings={preferences.showRatings}
              fontMultiplier={preferences.fontMultiplier}
              onSetShowWatchNotifications={setShowWatchNotifications}
              onSetUseDropCap={setUseDropCap}
              onSetShowRatings={setShowRatings}
              onSetFontMultiplier={setFontMultiplier}
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
      )}
    </View>
  )
}

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    headerTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.title3.fontSize,
      color: colors.foreground,
    },
    content: {},
    sectionLabel: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      color: colors.secondaryText,
      letterSpacing: typography.magazineMeta.letterSpacing,
      paddingHorizontal: 20,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
    },
    sectionFooter: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      color: colors.secondaryText,
      letterSpacing: typography.magazineMeta.letterSpacing,
      paddingHorizontal: 20,
      paddingTop: spacing.xs,
    },
    card: {
      marginHorizontal: 20,
      overflow: 'hidden',
    },
    cardWrapper: {
      marginHorizontal: 20,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: 20,
      minHeight: 44,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLabel: {
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.foreground,
    },
    rowValue: {
      fontFamily: fonts.system,
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
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxl,
    },
    signOutText: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.magazineMeta.fontSize,
      color: colors.red,
      letterSpacing: typography.magazineMeta.letterSpacing,
    },
    signOutPressed: {
      opacity: 0.6,
    },
  })
}
