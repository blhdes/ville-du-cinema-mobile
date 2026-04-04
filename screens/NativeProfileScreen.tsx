import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  InteractionManager,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useTabBarInset } from '@/hooks/useTabBarInset'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase/client'
import { getUserClippings, getBatchRepostStatus, type RepostStatus } from '@/services/clippings'
import { publishRepostStatus } from '@/hooks/useRepostCount'
import { getUserTakes } from '@/services/takes'
import { getBatchCommentCounts } from '@/services/comments'
import { getBatchLikeStatus, type LikeStatus } from '@/services/likes'
import { getUserSavedFilms } from '@/services/savedFilms'
import { getUserFavorites } from '@/services/favoriteFilms'
import { useUserLists } from '@/hooks/useUserLists'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Clipping, Take, SavedFilm, FavoriteFilm, FollowedVillageUser, VillagePublicProfile } from '@/types/database'
import ProfileSkeleton from '@/components/profile/ProfileSkeleton'
import ClippingCard from '@/components/profile/ClippingCard'
import RepostCard from '@/components/feed/RepostCard'
import TakeRepostCard from '@/components/feed/TakeRepostCard'
import ClippingRepostCard from '@/components/feed/ClippingRepostCard'
import TakeCard from '@/components/TakeCard'
import FeedDivider from '@/components/ui/FeedDivider'
import ExpandableAvatar from '@/components/ui/ExpandableAvatar'
import FollowButton from '@/components/ui/FollowButton'
import ProfileMediaSection from '@/components/profile/ProfileMediaSection'
import FeedFilterBar from '@/components/profile/FeedFilterBar'

const AVATAR_SIZE = 72
const HORIZONTAL_PAD = 20

type FeedItem =
  | { kind: 'take'; item: Take }
  | { kind: 'clipping'; item: Clipping }

export default function NativeProfileScreen() {
  const route = useRoute<RouteProp<FeedStackParamList, 'NativeProfile'>>()
  const { userId } = route.params
  const tabBarInset = useTabBarInset()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const { villageUserIds, addVillageUser, removeVillageUser } = useUserLists()

  const isFollowing = villageUserIds.includes(userId)
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()

  const [profile, setProfile] = useState<VillagePublicProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [clippings, setClippings] = useState<Clipping[]>([])
  const [takes, setTakes] = useState<Take[]>([])
  const [savedFilms, setSavedFilms] = useState<SavedFilm[]>([])
  const [favorites, setFavorites] = useState<FavoriteFilm[]>([])
  const [takeLikesMap, setTakeLikesMap] = useState<Map<string, LikeStatus>>(new Map())
  const [takeCommentCounts, setTakeCommentCounts] = useState<Map<string, number>>(new Map())
  const [takeRepostStatus, setTakeRepostStatus] = useState<Map<string, RepostStatus>>(new Map())
  const [contentLoading, setContentLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'takes' | 'clippings'>('all')

  useEffect(() => {
    let cancelled = false

    const task = InteractionManager.runAfterInteractions(async () => {
      const [profileResult, clippingsResult, takesResult, savedResult, favResult] = await Promise.allSettled([
        supabase
          .from('user_data')
          .select('user_id, username, display_name, avatar_url, bio, location, website_url, website_label, twitter_handle, letterboxd_username, followed_users, followed_village_users')
          .eq('user_id', userId)
          .single(),
        getUserClippings(userId),
        getUserTakes(userId),
        getUserSavedFilms(userId),
        getUserFavorites(userId),
      ])

      if (profileResult.status === 'fulfilled') {
        const { data, error } = profileResult.value
        if (data && !error && !cancelled) setProfile(data as VillagePublicProfile)
      }
      if (!cancelled) setProfileLoading(false)

      if (clippingsResult.status === 'fulfilled' && !cancelled) setClippings(clippingsResult.value)
      if (takesResult.status === 'fulfilled' && !cancelled) {
        const loadedTakes = takesResult.value
        setTakes(loadedTakes)
        const takeIds = loadedTakes.map((t) => t.id)
        if (takeIds.length > 0) {
          getBatchLikeStatus(takeIds).then(setTakeLikesMap).catch(() => {})
          getBatchCommentCounts(takeIds).then(setTakeCommentCounts).catch(() => {})
          getBatchRepostStatus(takeIds).then((statusMap) => {
            setTakeRepostStatus(statusMap)
            statusMap.forEach((status, id) => publishRepostStatus(id, status))
          }).catch(() => {})
        }
      }
      if (savedResult.status === 'fulfilled' && !cancelled) setSavedFilms(savedResult.value)
      if (favResult.status === 'fulfilled' && !cancelled) setFavorites(favResult.value)
      if (!cancelled) setContentLoading(false)
    })

    return () => { cancelled = true; task.cancel() }
  }, [userId])

  const handleFollowToggle = useCallback(async () => {
    if (!profile) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isFollowing) {
      await removeVillageUser(userId)
    } else {
      const villageUser: FollowedVillageUser = {
        user_id: userId,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        added_at: new Date().toISOString(),
      }
      await addVillageUser(villageUser)
    }
  }, [profile, isFollowing, userId, addVillageUser, removeVillageUser])

  const toggleFilter = useCallback((f: 'takes' | 'clippings') => {
    setFilter((prev) => (prev === f ? 'all' : f))
  }, [])

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

  const clippingUser = useMemo(() => profile ? {
    avatarUrl: profile.avatar_url ?? undefined,
    displayName: profile.display_name ?? profile.username ?? 'Village User',
  } : undefined, [profile])

  const followingCount = useMemo(() =>
    (profile?.followed_users?.length ?? 0) + (profile?.followed_village_users?.length ?? 0),
    [profile]
  )

  const listHeader = useMemo(() => {
    if (!profile) return null
    return (
      <>
        {/* Centered profile header */}
        <View style={styles.profileHeader}>
          <ExpandableAvatar
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            username={profile.username}
            size={AVATAR_SIZE}
          />

          {profile.display_name ? (
            <Text style={styles.displayName}>{profile.display_name}</Text>
          ) : null}

          {profile.username ? (
            <Text style={styles.handle}>@{profile.username}</Text>
          ) : null}

          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Following count · Follow button */}
          <View style={styles.socialRow}>
            <View style={styles.followingPill}>
              <Text style={styles.followingLabel}>Following</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{followingCount}</Text>
              </View>
            </View>
            <Text style={styles.socialDot}>·</Text>
            <FollowButton isFollowing={isFollowing} onPress={handleFollowToggle} />
          </View>
        </View>

        {/* Top-4 + watchlist (read-only) */}
        <ProfileMediaSection
          favorites={favorites}
          savedFilmsCount={savedFilms.length}
          onWatchlistPress={() => navigation.navigate('SavedFilms', {
            userId,
            username: profile.username ?? undefined,
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
      </>
    )
  }, [profile, followingCount, contentLoading, clippings, takes, savedFilms, favorites, filter, isFollowing, handleFollowToggle, toggleFilter, navigation, styles, colors, userId])

  const renderFeedItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.kind === 'take') {
      return (
        <TakeCard
          take={item.item}
          readOnly
          author={profile ? {
            avatarUrl: profile.avatar_url ?? undefined,
            displayName: profile.display_name ?? profile.username ?? 'Village User',
            userId,
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
          owner={{
            avatarUrl: clippingUser?.avatarUrl,
            displayName: clippingUser?.displayName ?? 'Village User',
            userId,
          }}
        />
      )
    }
    if (clipping.type === 'take-repost' && clipping.review_json) {
      return (
        <TakeRepostCard
          clipping={clipping}
          owner={{
            avatarUrl: clippingUser?.avatarUrl,
            displayName: clippingUser?.displayName ?? 'Village User',
            userId,
          }}
        />
      )
    }
    if (clipping.type === 'clipping-repost' && clipping.review_json) {
      return (
        <ClippingRepostCard
          clipping={clipping}
          owner={{
            avatarUrl: clippingUser?.avatarUrl,
            displayName: clippingUser?.displayName ?? 'Village User',
            userId,
          }}
        />
      )
    }
    return <ClippingCard clipping={clipping} readOnly user={clippingUser} />
  }, [clippingUser, userId, takeLikesMap, takeCommentCounts, takeRepostStatus])

  const emptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={filter === 'takes' ? 'chatbubble-outline' : filter === 'clippings' ? 'bookmark-outline' : 'film-outline'}
        size={32}
        color={colors.border}
      />
      <Text style={styles.emptyText}>
        {filter === 'takes' ? 'No takes yet.' : filter === 'clippings' ? 'No clippings yet.' : 'No takes or clippings yet.'}
      </Text>
    </View>
  ), [filter, styles, colors])

  return (
    <View style={styles.container}>
      {profileLoading || contentLoading ? (
        <ProfileSkeleton variant="native" />
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item) => `${item.kind}-${item.item.id}`}
          renderItem={renderFeedItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyState}
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
    profileHeader: {
      alignItems: 'center',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    displayName: {
      fontFamily: fonts.heading,
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
      color: colors.foreground,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    handle: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    bio: {
      fontFamily: fonts.body,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    socialRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    followingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    followingLabel: {
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
    socialDot: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      color: colors.secondaryText,
    },
    filterBar: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: HORIZONTAL_PAD,
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
    },
  })
}
