import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
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
import { getUserClippings, getBatchRepostStatus, type RepostStatus } from '@/services/clippings'
import { publishRepostStatus } from '@/hooks/useRepostCount'
import { getUserTakes } from '@/services/takes'
import { getBatchCommentCounts } from '@/services/comments'
import { publishCommentCount } from '@/hooks/useCommentCount'
import { getBatchLikeStatus, type LikeStatus } from '@/services/likes'
import { getUserSavedFilms } from '@/services/savedFilms'
import type { Clipping, Take, SavedFilm } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { useFavoriteFilms } from '@/hooks/useFavoriteFilms'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ProfileHeader from '@/components/profile/ProfileHeader'
import ProfileMediaSection from '@/components/profile/ProfileMediaSection'
import ProfileSkeleton from '@/components/profile/ProfileSkeleton'
import ClippingCard from '@/components/profile/ClippingCard'
import RepostCard from '@/components/feed/RepostCard'
import TakeRepostCard from '@/components/feed/TakeRepostCard'
import ClippingRepostCard from '@/components/feed/ClippingRepostCard'
import TakeCard from '@/components/TakeCard'
import FeedDivider from '@/components/ui/FeedDivider'
import FeedFilterBar from '@/components/profile/FeedFilterBar'

const HORIZONTAL_PAD = 20
const FAB_SIZE = 52

type FeedItem =
  | { kind: 'take'; item: Take }
  | { kind: 'clipping'; item: Clipping }

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

  // Feed filter state
  const [filter, setFilter] = useState<'all' | 'takes' | 'clippings'>('all')
  const toggleFilter = useCallback((f: 'takes' | 'clippings') => {
    setFilter((prev) => (prev === f ? 'all' : f))
  }, [])

  // Favorites
  const { favorites, refetch: refetchFavorites } = useFavoriteFilms()

  // Clippings + Takes + Saved Films state
  const [clippings, setClippings] = useState<Clipping[]>([])
  const [takes, setTakes] = useState<Take[]>([])
  const [savedFilms, setSavedFilms] = useState<SavedFilm[]>([])
  const [takeLikesMap, setTakeLikesMap] = useState<Map<string, LikeStatus>>(new Map())
  const [takeCommentCounts, setTakeCommentCounts] = useState<Map<string, number>>(new Map())
  const [takeRepostStatus, setTakeRepostStatus] = useState<Map<string, RepostStatus>>(new Map())
  const [contentLoading, setContentLoading] = useState(true)
  const [clippingsError, setClippingsError] = useState(false)
  const hasLoadedOnce = useRef(false)

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
      if (!hasLoadedOnce.current) {
        setContentLoading(true)
      }
      setClippingsError(false)

      Promise.allSettled([getUserClippings(user.id), getUserTakes(user.id), getUserSavedFilms(user.id)])
        .then(([clippingsResult, takesResult, savedResult]) => {
          if (cancelled) return
          if (clippingsResult.status === 'fulfilled') setClippings(clippingsResult.value)
          else setClippingsError(true)
          if (takesResult.status === 'fulfilled') {
            const loadedTakes = takesResult.value
            setTakes(loadedTakes)
            const takeIds = loadedTakes.map((t) => t.id)
            if (takeIds.length > 0) {
              getBatchLikeStatus(takeIds).then(setTakeLikesMap).catch(() => {})
              getBatchCommentCounts(takeIds).then((countsMap) => {
                setTakeCommentCounts(countsMap)
                countsMap.forEach((count, id) => publishCommentCount(id, count))
              }).catch(() => {})
              getBatchRepostStatus(takeIds).then((statusMap) => {
                setTakeRepostStatus(statusMap)
                statusMap.forEach((status, id) => publishRepostStatus(id, status))
              }).catch(() => {})
            }
          }
          if (savedResult.status === 'fulfilled') setSavedFilms(savedResult.value)
          refetchFavorites()
        })
        .finally(() => {
          if (!cancelled) {
            setContentLoading(false)
            hasLoadedOnce.current = true
          }
        })

      return () => { cancelled = true }
    }, [user]),
  )

  const clippingUser = useMemo(() => profile ? {
    avatarUrl: profile.avatar_url ?? undefined,
    displayName: profile.display_name ?? profile.username ?? 'You',
  } : undefined, [profile])

  const feedItems = useMemo(() => {
    const items: FeedItem[] = [
      ...takes.map((t) => ({ kind: 'take' as const, item: t })),
      ...clippings.map((c) => ({ kind: 'clipping' as const, item: c })),
    ]
    items.sort((a, b) =>
      new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime()
    )
    if (filter === 'takes') return items.filter((i) => i.kind === 'take')
    if (filter === 'clippings') return items.filter((i) => i.kind === 'clipping')
    return items
  }, [takes, clippings, filter])

  const followingCount = followedUsers.length + villageUsers.length

  const listHeader = useMemo(() => {
    if (!user) return null
    return (
      <>
        {profile && (
          <ProfileHeader
            profile={profile}
            email={user.email}
            showEdit
            followingCount={followingCount}
            onFollowingPress={() => navigation.navigate('FollowingScreen')}
          />
        )}

        <ProfileMediaSection
          favorites={favorites}
          editable
          onEditSlot={(pos) => navigation.navigate('FavoriteFilmPicker', { position: pos })}
          savedFilmsCount={savedFilms.length}
          onWatchlistPress={() => navigation.navigate('SavedFilms', {
            userId: user.id,
            username: profile?.username ?? undefined,
          })}
        />

        <FeedDivider />

        {/* Feed filter bar */}
        <View style={styles.filterBar}>
          <FeedFilterBar
            filter={filter}
            takesCount={contentLoading ? null : takes.length}
            clippingsCount={contentLoading ? null : clippings.length}
            onToggle={toggleFilter}
          />
        </View>

        <FeedDivider />

        {/* Clippings load error */}
        {clippingsError && (
          <Text style={styles.emptyText}>
            Something went wrong loading your clippings.
          </Text>
        )}
      </>
    )
  }, [user, profile, followingCount, colors, filter, toggleFilter, contentLoading, clippingsError, clippings, takes, savedFilms, favorites, navigation, styles])

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.kind === 'take') {
      return (
        <TakeCard
          take={item.item}
          onDeleted={handleTakeDeleted}
          author={profile && user ? {
            avatarUrl: profile.avatar_url ?? undefined,
            displayName: profile.display_name ?? profile.username ?? 'You',
            userId: user.id,
            username: profile.username ?? undefined,
          } : undefined}
          initialLiked={takeLikesMap.get(item.item.id)?.liked}
          initialLikeCount={takeLikesMap.get(item.item.id)?.count}
          initialCommentCount={takeCommentCounts.get(item.item.id) ?? 0}
          initialRepostCount={takeRepostStatus.get(item.item.id)?.count ?? 0}
          initialReposted={takeRepostStatus.get(item.item.id)?.reposted ?? false}
        />
      )
    }
    const clipping = item.item
    if (clipping.type === 'repost' && clipping.review_json) {
      return (
        <RepostCard
          clipping={clipping}
          onDeleted={handleClippingDeleted}
          owner={{
            avatarUrl: clippingUser?.avatarUrl,
            displayName: clippingUser?.displayName ?? 'You',
          }}
        />
      )
    }
    if (clipping.type === 'take-repost' && clipping.review_json) {
      return (
        <TakeRepostCard
          clipping={clipping}
          onDeleted={handleClippingDeleted}
          owner={{
            avatarUrl: clippingUser?.avatarUrl,
            displayName: clippingUser?.displayName ?? 'You',
          }}
        />
      )
    }
    if (clipping.type === 'clipping-repost' && clipping.review_json) {
      return (
        <ClippingRepostCard
          clipping={clipping}
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
        clipping={clipping}
        onDeleted={handleClippingDeleted}
        user={clippingUser}
      />
    )
  }, [handleClippingDeleted, handleTakeDeleted, clippingUser, takeLikesMap, takeCommentCounts, takeRepostStatus])

  const emptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={filter === 'takes' ? 'chatbubble-outline' : filter === 'clippings' ? 'bookmark-outline' : 'film-outline'}
        size={32}
        color={colors.border}
      />
      <Text style={styles.emptyText}>
        {filter === 'takes'
          ? 'No takes yet.\nShare your thoughts on a film.'
          : filter === 'clippings'
          ? 'Your archive is empty.\nHighlight text in reviews to save them here.'
          : 'No activity yet.'}
      </Text>
    </View>
  ), [filter, styles, colors])

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
          data={feedItems}
          keyExtractor={(item) => `${item.kind}-${item.item.id}`}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyState}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={9}
          contentContainerStyle={{ paddingBottom: tabBarInset + 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ---- Compose FAB ---- */}
      <Pressable
        onPress={() => navigation.navigate('CreateTake', undefined)}
        style={({ pressed }) => [styles.fab, { bottom: tabBarInset + spacing.md }, pressed && styles.fabPressed]}
      >
        <Ionicons name="create-outline" size={24} color={colors.background} />
      </Pressable>
    </View>
  )
}

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    fab: {
      position: 'absolute',
      right: HORIZONTAL_PAD,
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    fabPressed: {
      opacity: 0.75,
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
    filterBar: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: HORIZONTAL_PAD,
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
    guestText: {
      fontFamily: fonts.system,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      textAlign: 'center',
    },
  })
}
