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
import { useTabBarInset } from '@/hooks/useTabBarInset'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { useUser } from '@/hooks/useUser'
import { useProfile } from '@/contexts/ProfileContext'
import { useTabBar } from '@/contexts/TabBarContext'
import { useUserLists } from '@/hooks/useUserLists'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import { getUserClippings } from '@/services/clippings'
import { getUserTakes } from '@/services/takes'
import { getUserSavedFilms } from '@/services/savedFilms'
import type { Clipping, Take, SavedFilm } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { useFavoriteFilms } from '@/hooks/useFavoriteFilms'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ProfileHeader from '@/components/profile/ProfileHeader'
import FavoriteFilmsGrid from '@/components/profile/FavoriteFilmsGrid'
import ProfileSkeleton from '@/components/profile/ProfileSkeleton'
import FollowingList from '@/components/profile/FollowingList'
import ClippingCard from '@/components/profile/ClippingCard'
import RepostCard from '@/components/feed/RepostCard'
import TakeCard from '@/components/TakeCard'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const HORIZONTAL_PAD = 20

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const tabBarInset = useTabBarInset()
  const { user } = useUser()
  const { profile, isLoading, error } = useProfile()
  const { users: followedUsers, villageUsers } = useUserLists()
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>()
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

  // Favorites
  const { favorites, refetch: refetchFavorites } = useFavoriteFilms()

  // Clippings + Takes + Saved Films state
  const [clippings, setClippings] = useState<Clipping[]>([])
  const [takes, setTakes] = useState<Take[]>([])
  const [savedFilms, setSavedFilms] = useState<SavedFilm[]>([])
  const [contentLoading, setContentLoading] = useState(true)
  const [clippingsError, setClippingsError] = useState(false)

  const handleClippingDeleted = useCallback((id: string) => {
    setClippings((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const handleTakeDeleted = useCallback((id: string) => {
    setTakes((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!user) return

      let cancelled = false
      setContentLoading(true)
      setClippingsError(false)

      Promise.allSettled([getUserClippings(user.id), getUserTakes(user.id), getUserSavedFilms(user.id)])
        .then(([clippingsResult, takesResult, savedResult]) => {
          if (cancelled) return
          if (clippingsResult.status === 'fulfilled') setClippings(clippingsResult.value)
          else setClippingsError(true)
          if (takesResult.status === 'fulfilled') setTakes(takesResult.value)
          if (savedResult.status === 'fulfilled') setSavedFilms(savedResult.value)
          refetchFavorites()
        })
        .finally(() => {
          if (!cancelled) setContentLoading(false)
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

        {/* Favorite Films grid */}
        <FavoriteFilmsGrid
          favorites={favorites}
          editable
          onEditSlot={(pos) => navigation.navigate('FavoriteFilmPicker', { position: pos })}
        />

        {/* Watchlist link */}
        {savedFilms.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.watchlistLink, pressed && styles.pressed]}
            onPress={() => navigation.navigate('SavedFilms', {
              userId: user.id,
              username: profile?.username ?? undefined,
            })}
          >
            <Ionicons name="bookmark-outline" size={16} color={colors.teal} />
            <Text style={styles.watchlistLinkText}>
              Watchlist ({savedFilms.length})
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
          </Pressable>
        )}

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

        {/* Takes section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Takes</Text>
          <Pressable
            onPress={() => navigation.navigate('CreateTake', undefined)}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.teal} />
          </Pressable>
        </View>

        {takes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={32} color={colors.border} />
            <Text style={styles.emptyText}>
              No takes yet.{'\n'}Share your thoughts on a film.
            </Text>
          </View>
        ) : (
          takes.map((take) => (
            <TakeCard key={take.id} take={take} onDeleted={handleTakeDeleted} />
          ))
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
  }, [user, profile, followedUsers, villageUsers, colors, followingExpanded, toggleFollowing, contentLoading, clippingsError, clippings, takes, savedFilms, favorites, handleTakeDeleted, navigation, styles])

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

      {isLoading || contentLoading ? (
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
          contentContainerStyle={{ paddingBottom: tabBarInset + 20 }}
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
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
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
    pressed: {
      opacity: 0.6,
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
    watchlistLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.md,
    },
    watchlistLinkText: {
      flex: 1,
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      color: colors.teal,
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
