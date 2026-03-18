import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  Platform,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@/hooks/useUser'
import { useProfile } from '@/contexts/ProfileContext'
import { useUserLists } from '@/hooks/useUserLists'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import { getUserClippings } from '@/services/clippings'
import type { Clipping } from '@/types/database'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ProfileHeader from '@/components/profile/ProfileHeader'
import ProfileSkeleton from '@/components/profile/ProfileSkeleton'
import FollowingList from '@/components/profile/FollowingList'
import ClippingCard from '@/components/profile/ClippingCard'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const HORIZONTAL_PAD = 20

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { user } = useUser()
  const { profile, isLoading, error } = useProfile()
  const { users: followedUsers, villageUsers } = useUserLists()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  // Following accordion state
  const [followingExpanded, setFollowingExpanded] = useState(false)

  const toggleFollowing = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setFollowingExpanded((prev) => !prev)
  }, [])

  // Clippings state
  const [clippings, setClippings] = useState<Clipping[]>([])
  const [clippingsLoading, setClippingsLoading] = useState(true)
  const [clippingsError, setClippingsError] = useState(false)

  const handleClippingDeleted = useCallback((id: string) => {
    setClippings((prev) => prev.filter((c) => c.id !== id))
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!user) return

      let cancelled = false
      setClippingsLoading(true)
      setClippingsError(false)

      getUserClippings(user.id)
        .then((data) => {
          if (!cancelled) setClippings(data)
        })
        .catch(() => {
          if (!cancelled) setClippingsError(true)
        })
        .finally(() => {
          if (!cancelled) setClippingsLoading(false)
        })

      return () => { cancelled = true }
    }, [user]),
  )

  // Guest mode
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

  const listHeader = (
    <>
      {profile && <ProfileHeader profile={profile} email={user.email} showEdit />}

      {/* Following accordion */}
      <View style={styles.divider} />
      <Pressable onPress={toggleFollowing} style={styles.accordionToggle}>
        <Text style={styles.accordionLabel}>
          VILLAGE ({followedUsers.length + villageUsers.length})
        </Text>
        <Ionicons
          name={followingExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.secondaryText}
        />
      </Pressable>
      {followingExpanded && (
        <View style={styles.followingSection}>
          <FollowingList letterboxdUsers={followedUsers} villageUsers={villageUsers} />
        </View>
      )}
      <View style={styles.divider} />

      {/* Clippings section label */}
      <Text style={styles.sectionLabel}>CLIPPINGS</Text>

      {/* Loading / error / empty states */}
      {clippingsLoading && (
        <ActivityIndicator
          color={colors.secondaryText}
          style={styles.clippingsLoading}
        />
      )}
      {clippingsError && !clippingsLoading && (
        <Text style={styles.emptyText}>
          Something went wrong loading your clippings.
        </Text>
      )}
      {!clippingsLoading && !clippingsError && clippings.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={32} color={colors.border} />
          <Text style={styles.emptyText}>
            Your archive is empty.{'\n'}Highlight text in reviews to save them here.
          </Text>
        </View>
      )}
    </>
  )

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {error && <ErrorBanner message={error} />}

      {isLoading ? (
        <ProfileSkeleton variant="self" />
      ) : (
        <FlatList
          data={clippingsLoading ? [] : clippings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClippingCard
              clipping={item}
              onDeleted={handleClippingDeleted}
              user={profile ? {
                avatarUrl: profile.avatar_url ?? undefined,
                displayName: profile.display_name ?? profile.username ?? 'You',
              } : undefined}
            />
          )}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingBottom: tabBarHeight + insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: HORIZONTAL_PAD,
    },
    accordionToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.md,
    },
    accordionLabel: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    followingSection: {
      paddingBottom: spacing.md,
    },
    sectionLabel: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    clippingsLoading: {
      paddingVertical: spacing.xxl,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: HORIZONTAL_PAD,
      gap: spacing.md,
    },
    emptyText: {
      fontFamily: fonts.bodyItalic,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      textAlign: 'center',
      paddingHorizontal: HORIZONTAL_PAD,
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
}
