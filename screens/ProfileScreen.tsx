import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
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
import { useTabBar } from '@/contexts/TabBarContext'
import { useUserLists } from '@/hooks/useUserLists'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import { getUserClippings } from '@/services/clippings'
import type { Clipping } from '@/types/database'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ProfileHeader from '@/components/profile/ProfileHeader'
import ProfileSkeleton from '@/components/profile/ProfileSkeleton'
import FollowingList from '@/components/profile/FollowingList'
import ClippingCard from '@/components/profile/ClippingCard'
import RepostCard from '@/components/feed/RepostCard'

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
  const typography = useTypography()
  const { profileScrollTopRequested } = useTabBar()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const flatListRef = useRef<FlatList>(null)

  // Scroll to top when Profile tab is tapped while already at root
  useEffect(() => {
    if (profileScrollTopRequested > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
    }
  }, [profileScrollTopRequested])

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

  const clippingUser = useMemo(() => profile ? {
    avatarUrl: profile.avatar_url ?? undefined,
    displayName: profile.display_name ?? profile.username ?? 'You',
  } : undefined, [profile])

  const listHeader = useMemo(() => {
    if (!user) return null
    return (
      <>
        {profile && <ProfileHeader profile={profile} email={user.email} showEdit />}

        {/* Following accordion */}
        <View style={styles.divider} />
        <Pressable onPress={toggleFollowing} style={styles.accordionToggle}>
          <Text style={styles.accordionLabel}>Following</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{followedUsers.length + villageUsers.length}</Text>
          </View>
          <View style={{ flex: 1 }} />
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
        <Text style={styles.sectionLabel}>Clippings</Text>

        {/* Error / empty states */}
        {clippingsError && (
          <Text style={styles.emptyText}>
            Something went wrong loading your clippings.
          </Text>
        )}
        {!clippingsError && clippings.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={32} color={colors.border} />
            <Text style={styles.emptyText}>
              Your archive is empty.{'\n'}Highlight text in reviews to save them here.
            </Text>
          </View>
        )}
      </>
    )
  }, [user, profile, followedUsers, villageUsers, colors, followingExpanded, toggleFollowing, clippingsLoading, clippingsError, clippings, styles])

  const renderItem = useCallback(({ item }: { item: Clipping }) => {
    if (item.type === 'repost' && item.review_json) {
      return (
        <RepostCard
          clipping={item}
          onDeleted={handleClippingDeleted}
          owner={{
            avatarUrl: clippingUser?.avatarUrl,
            displayName: clippingUser?.displayName ?? 'You',
          }}
        />
      )
    }
    return (
      <ClippingCard
        clipping={item}
        onDeleted={handleClippingDeleted}
        user={clippingUser}
      />
    )
  }, [handleClippingDeleted, clippingUser])

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {error && <ErrorBanner message={error} />}

      {isLoading || clippingsLoading ? (
        <ProfileSkeleton variant="self" />
      ) : (
        <FlatList
          ref={flatListRef}
          data={clippings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={9}
          contentContainerStyle={{ paddingBottom: tabBarHeight + insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        />
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
      gap: 6,
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.md,
    },
    accordionLabel: {
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
    followingSection: {
      paddingBottom: spacing.md,
    },
    sectionLabel: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: HORIZONTAL_PAD,
      gap: spacing.md,
    },
    emptyText: {
      fontFamily: fonts.system,
      fontStyle: 'italic' as const,
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
      fontFamily: fonts.system,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      textAlign: 'center',
    },
  })
}
