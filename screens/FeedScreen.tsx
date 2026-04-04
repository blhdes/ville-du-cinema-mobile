import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type LayoutChangeEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTabBarInset } from '@/hooks/useTabBarInset'
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as SplashScreen from 'expo-splash-screen'
import type { FeedStackParamList } from '@/navigation/types'
import { useUserLists } from '@/hooks/useUserLists'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useTabBar } from '@/contexts/TabBarContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useProfile } from '@/contexts/ProfileContext'
import { useClippings } from '@/hooks/useClippings'
import { fetchFeed, clearFeedCache, type FeedResult } from '@/services/feed'
import { getVillageClippings } from '@/services/clippings'
import { getVillageTakes } from '@/services/takes'
import { getBatchLikeStatus, type LikeStatus } from '@/services/likes'
import { publishLikeStatus } from '@/hooks/useLike'
import { getBatchCommentCounts } from '@/services/comments'
import { publishCommentCount } from '@/hooks/useCommentCount'
import { getBatchRepostStatus, type RepostStatus } from '@/services/clippings'
import { publishRepostStatus } from '@/hooks/useRepostCount'
import type { Review, FeedItem, Clipping, Take, RepostFeedItem, TakeFeedItem, TakeRepostFeedItem, ClippingRepostFeedItem } from '@/types/database'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ReviewCard from '@/components/ReviewCard'
import ClippingCard from '@/components/profile/ClippingCard'
import RepostCard from '@/components/feed/RepostCard'
import TakeRepostCard from '@/components/feed/TakeRepostCard'
import ClippingRepostCard from '@/components/feed/ClippingRepostCard'
import TakeCard from '@/components/TakeCard'
import ReviewCardSkeleton from '@/components/feed/ReviewCardSkeleton'
import WatchNotification from '@/components/WatchNotification'
import QuoteOfTheDay from '@/components/QuoteOfTheDay'
import Spinner from '@/components/ui/Spinner'
import LogoIcon from '@/components/ui/LogoIcon'
import DrawerTrigger from '@/components/feed/DrawerTrigger'
import FeedEmptyState from '@/components/feed/FeedEmptyState'

// Deadzone: header only starts hiding after this many px of continuous downward scroll.
// Scrolling up has 0px threshold — the header reveals immediately.
const DOWN_DEADZONE = 8

// Scroll positions below this are a "safe zone" — the tab bar always snaps back to
// visible so users who just opened the app can switch tabs freely.
const TOP_THRESHOLD = 250

// Spring config for snap animations — relaxed, deliberate settling for an editorial feel.
const SNAP_SPRING = { damping: 24, stiffness: 120, mass: 1.0, overshootClamping: true }

const keyExtractor = (item: FeedItem): string => {
  if (item.kind === 'review') return `review-${item.data.id}`
  if (item.kind === 'repost') return `repost-${item.data.id}`
  if (item.kind === 'take-repost') return `take-repost-${item.data.id}`
  if (item.kind === 'clipping-repost') return `clipping-repost-${item.data.id}`
  if (item.kind === 'take') return `take-${item.data.id}`
  return `clipping-${item.data.id}`
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const tabBarInset = useTabBarInset()
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>()
  const { usernames, villageUsers, villageUserIds, isLoading: isListLoading, error: listError, clearError } = useUserLists()
  const { preferences } = useDisplayPreferences()
  const { translateY, feedRefreshRequested, setIsFeedRefreshing } = useTabBar()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const { profile } = useProfile()
  const { clippings, refetch: refetchClippings, removeClipping } = useClippings()

  // Header hide/show
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerTranslateY = useSharedValue(0)
  const downAccumulator = useSharedValue(0)
  const isDragging = useSharedValue(false)
  const scrollY = useSharedValue(0)
  const lastScrollDirection = useSharedValue(0)
  const spinnerProgress = useSharedValue(1)
  // Gate: prevents scroll worklets from touching translateY after leaving FeedScreen.
  const isFocused = useSharedValue(true)

  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setHeaderHeight(e.nativeEvent.layout.height)
  }, [])

  // Outer container: translateY only — background stays 100% opaque.
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    opacity: 1,
  }))

  // Inner content: opacity fades the buttons/logo, leaving a clean solid bar behind.
  const headerContentOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      headerTranslateY.value,
      [-headerHeight, 0],
      [0, 1],
    ),
  }))

  // Snap bars to a definitive visible/hidden state — no halfway positions.
  const snapToFinalState = (currentScrollY: number) => {
    'worklet'
    // Don't touch the tab bar after leaving FeedScreen (prevents stuck-hidden bug).
    if (!isFocused.value) return
    // Top safe zone — always animate back to fully visible.
    if (currentScrollY < TOP_THRESHOLD) {
      translateY.value = withSpring(0, SNAP_SPRING)
      headerTranslateY.value = withSpring(0, SNAP_SPRING)
      return
    }

    if (lastScrollDirection.value > 0) {
      // Was scrolling DOWN → snap fully hidden.
      translateY.value = withSpring(tabBarInset, SNAP_SPRING)
      headerTranslateY.value = withSpring(-headerHeight, SNAP_SPRING)
    } else {
      // Was scrolling UP → only lock visible if the user scrolled hard enough
      // to fully reveal the bar (translateY ≈ 0). Otherwise snap back to hidden.
      if (translateY.value < 1) {
        translateY.value = withSpring(0, SNAP_SPRING)
        headerTranslateY.value = withSpring(0, SNAP_SPRING)
      } else {
        translateY.value = withSpring(tabBarInset, SNAP_SPRING)
        headerTranslateY.value = withSpring(-headerHeight, SNAP_SPRING)
      }
    }
  }

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: (event, ctx: { prevY: number }) => {
      isDragging.value = true
      ctx.prevY = event.contentOffset.y
      downAccumulator.value = 0
    },
    onScroll: (event, ctx: { prevY: number }) => {
      const currentY = event.contentOffset.y
      scrollY.value = currentY
      const delta = currentY - ctx.prevY
      ctx.prevY = currentY

      // Don't manipulate bars after leaving FeedScreen.
      if (!isFocused.value) return

      // Track direction during both drag and momentum (needed for snap decisions).
      if (delta !== 0) {
        lastScrollDirection.value = delta
      }

      if (currentY <= 0) {
        // At the very top — always fully visible.
        headerTranslateY.value = 0
        translateY.value = 0
        downAccumulator.value = 0
        return
      }

      if (delta > 0) {
        // Scrolling down — deadzone only applies during active drag, not momentum.
        if (isDragging.value) {
          downAccumulator.value += delta
          if (downAccumulator.value <= DOWN_DEADZONE) return
        }
        headerTranslateY.value = Math.max(
          -headerHeight,
          Math.min(0, headerTranslateY.value - delta),
        )
        translateY.value = Math.min(
          tabBarInset,
          Math.max(0, translateY.value + delta),
        )
      } else if (delta < 0) {
        // Scrolling up — immediate 1:1 (0px threshold)
        downAccumulator.value = 0
        headerTranslateY.value = Math.max(
          -headerHeight,
          Math.min(0, headerTranslateY.value - delta),
        )
        translateY.value = Math.min(
          tabBarInset,
          Math.max(0, translateY.value + delta),
        )
      }
    },
    onEndDrag: (event) => {
      isDragging.value = false
      snapToFinalState(event.contentOffset.y)
    },
    onMomentumEnd: (event) => {
      snapToFinalState(event.contentOffset.y)
    },
  })

  // Gate the scroll handler and reset bars when leaving/returning to FeedScreen.
  useFocusEffect(
    useCallback(() => {
      isFocused.value = true
      return () => {
        isFocused.value = false
        translateY.value = withTiming(0, { duration: 200 })
        headerTranslateY.value = withTiming(0, { duration: 200 })
      }
    }, [isFocused, translateY, headerTranslateY])
  )

  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)

  const flatListRef = useRef<Animated.FlatList<FeedItem>>(null)
  const [villageClippings, setVillageClippings] = useState<Clipping[]>([])
  const [villageTakes, setVillageTakes] = useState<Take[]>([])
  const [takeLikesMap, setTakeLikesMap] = useState<Map<string, LikeStatus>>(new Map())
  const [takeCommentCounts, setTakeCommentCounts] = useState<Map<string, number>>(new Map())
  const [takeRepostStatus, setTakeRepostStatus] = useState<Map<string, RepostStatus>>(new Map())

  // Fetch clippings + takes from followed Village users whenever the follow list changes
  useEffect(() => {
    // Include the current user's ID so their own Takes appear in the feed.
    // Clippings intentionally exclude self — only followed users' clippings show.
    const takeUserIds = profile?.user_id
      ? [...new Set([...villageUserIds, profile.user_id])]
      : villageUserIds

    if (villageUserIds.length === 0 && !profile?.user_id) {
      setVillageClippings([])
      setVillageTakes([])
      return
    }
    if (villageUserIds.length > 0) {
      getVillageClippings(villageUserIds)
        .then(setVillageClippings)
        .catch(() => {})
    }
    if (takeUserIds.length > 0) {
      getVillageTakes(takeUserIds)
        .then(setVillageTakes)
        .catch(() => {})
    }
  }, [villageUserIds, profile?.user_id])

  // Batch-fetch like/comment data for all takes in the feed
  const refetchSocialData = useCallback(() => {
    const takeIds = villageTakes.map((t) => t.id)
    if (takeIds.length === 0) {
      setTakeLikesMap(new Map())
      setTakeCommentCounts(new Map())
      return
    }
    getBatchLikeStatus(takeIds).then((statusMap) => {
      setTakeLikesMap(statusMap)
      statusMap.forEach((status, id) => publishLikeStatus(id, status))
    }).catch(() => {})
    getBatchCommentCounts(takeIds).then((countsMap) => {
      setTakeCommentCounts(countsMap)
      countsMap.forEach((count, id) => publishCommentCount(id, count))
    }).catch(() => {})
    getBatchRepostStatus(takeIds).then((statusMap) => {
      setTakeRepostStatus(statusMap)
      statusMap.forEach((status, id) => publishRepostStatus(id, status))
    }).catch(() => {})
  }, [villageTakes])

  // Initial fetch when takes change
  useEffect(() => { refetchSocialData() }, [refetchSocialData])

  // Re-fetch likes & comment counts when returning from TakeDetail
  useFocusEffect(useCallback(() => { refetchSocialData() }, [refetchSocialData]))

  const refetchVillageContent = useCallback(() => {
    const takeUserIds = profile?.user_id
      ? [...new Set([...villageUserIds, profile.user_id])]
      : villageUserIds

    if (villageUserIds.length > 0) {
      getVillageClippings(villageUserIds)
        .then(setVillageClippings)
        .catch(() => {})
    } else {
      setVillageClippings([])
    }
    if (takeUserIds.length > 0) {
      getVillageTakes(takeUserIds)
        .then(setVillageTakes)
        .catch(() => {})
    } else {
      setVillageTakes([])
    }
  }, [villageUserIds, profile?.user_id])

  const loadFeed = useCallback(async (pageNum: number, append = false, keepContent = false) => {
    if (usernames.length === 0) {
      setReviews([])
      setHasMore(false)
      setIsLoading(false)
      setIsRefreshing(false)
      setIsFeedRefreshing(false)
      return
    }

    // keepContent: show RefreshControl spinner but don't swap to full-screen loader
    if (!append && !keepContent) setIsLoading(true)
    if (append) setIsLoadingMore(true)
    setFeedError(null)

    try {
      const result: FeedResult = await fetchFeed(usernames, pageNum)

      if (append) {
        setReviews((prev) => {
          const existingIds = new Set(prev.map((r) => r.id))
          const newItems = result.reviews.filter((r) => !existingIds.has(r.id))
          return [...prev, ...newItems]
        })
      } else {
        setReviews(result.reviews)
      }
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch (err) {
      setFeedError('Failed to load feed')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
      setIsLoadingMore(false)
      setIsFeedRefreshing(false)
    }
  }, [usernames, setIsFeedRefreshing])

  // Wait for cache hydration + user list before loading the feed.
  // fetchUserFeed already scrapes any missing avatars, so no extra refresh needed here.
  useEffect(() => {
    if (!isListLoading) {
      loadFeed(1)
    }
  }, [usernames, isListLoading, loadFeed])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    clearFeedCache()
    refetchClippings()
    refetchVillageContent()
    loadFeed(1)
  }, [loadFeed, refetchClippings, refetchVillageContent])

  // Smart tab press: scroll-to-top if scrolled down, refresh only if already at top
  useEffect(() => {
    if (feedRefreshRequested > 0) {
      // Always reveal header + tab bar
      headerTranslateY.value = withTiming(0, { duration: 200 })
      translateY.value = withTiming(0, { duration: 200 })

      if (scrollY.value > 5) {
        // Scrolled down — only scroll to top, no data fetch
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
      } else {
        // Already at top — trigger refresh with existing content visible
        setIsFeedRefreshing(true)
        setIsRefreshing(true)
        clearFeedCache()
        refetchClippings()
        refetchVillageContent()
        loadFeed(1, false, true)
      }
    }
  }, [feedRefreshRequested]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadFeed(page + 1, true)
    }
  }, [hasMore, isLoading, page, loadFeed])

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer())
  }, [navigation])

  // When layout-altering display settings change, force a clean FlatList remount
  // so ReviewCard components recalculate their layout from scratch.
  const layoutKey = useMemo(
    () => `feed-${preferences.fontMultiplier}-${preferences.showRatings}-${preferences.useDropCap}`,
    [preferences.fontMultiplier, preferences.showRatings, preferences.useDropCap],
  )

  // Reset tab bar + header after a FlatList remount from settings changes.
  // Without this, the bars stay stuck offscreen because no scroll event fires after remount.
  useEffect(() => {
    translateY.value = withTiming(0, { duration: 200 })
    headerTranslateY.value = withTiming(0, { duration: 200 })
  }, [layoutKey, translateY, headerTranslateY])

  // Lookup map: Village user_id → display info (built from followed users + self)
  const villageUserMap = useMemo(() => {
    const map = new Map<string, { displayName: string; avatarUrl: string | undefined; username: string | undefined }>()
    for (const u of villageUsers) {
      map.set(u.user_id, {
        displayName: u.display_name ?? u.username ?? 'Village User',
        avatarUrl: u.avatar_url ?? undefined,
        username: u.username ?? undefined,
      })
    }
    // Add self so own takes render with the correct name/avatar
    if (profile?.user_id) {
      map.set(profile.user_id, {
        displayName: profile.display_name ?? profile.username ?? 'Me',
        avatarUrl: profile.avatar_url ?? undefined,
        username: profile.username ?? undefined,
      })
    }
    return map
  }, [villageUsers, profile?.user_id, profile?.display_name, profile?.username, profile?.avatar_url])

  // Merge RSS reviews + own clippings + followed Village clippings into one chronological feed
  const feedItems = useMemo((): FeedItem[] => {
    const reviewItems = reviews.map((r): FeedItem => ({
      kind: 'review',
      sortKey: r.pubDate ? new Date(r.pubDate).getTime() : 0,
      data: r,
    }))

    const ownerDisplayName = profile?.display_name ?? profile?.username ?? 'Me'
    const ownerAvatarUrl = profile?.avatar_url ?? undefined

    const ownQuotes = clippings.filter((c) => c.type === 'quote')
    const ownReposts = clippings.filter((c) => c.type === 'repost')
    const ownTakeReposts = clippings.filter((c) => c.type === 'take-repost')
    const ownClippingReposts = clippings.filter((c) => c.type === 'clipping-repost')

    const clippingItems = ownQuotes.map((c): FeedItem => ({
      kind: 'clipping',
      sortKey: new Date(c.created_at).getTime(),
      data: c,
      ownerAvatarUrl,
      ownerDisplayName,
    }))

    const repostItems: FeedItem[] = ownReposts.map((c): RepostFeedItem => ({
      kind: 'repost',
      sortKey: new Date(c.created_at).getTime(),
      data: c,
      ownerAvatarUrl,
      ownerDisplayName,
    }))

    const takeRepostItems: FeedItem[] = ownTakeReposts.map((c): TakeRepostFeedItem => ({
      kind: 'take-repost',
      sortKey: new Date(c.created_at).getTime(),
      data: c,
      ownerAvatarUrl,
      ownerDisplayName,
    }))

    const clippingRepostItems: FeedItem[] = ownClippingReposts.map((c): ClippingRepostFeedItem => ({
      kind: 'clipping-repost',
      sortKey: new Date(c.created_at).getTime(),
      data: c,
      ownerAvatarUrl,
      ownerDisplayName,
    }))

    const villageQuotes = villageClippings.filter((c) => c.type === 'quote')
    const villageReposts = villageClippings.filter((c) => c.type === 'repost')
    const villageTakeReposts = villageClippings.filter((c) => c.type === 'take-repost')
    const villageClippingReposts = villageClippings.filter((c) => c.type === 'clipping-repost')

    const villageClippingItems = villageQuotes.map((c): FeedItem => {
      const owner = villageUserMap.get(c.user_id)
      return {
        kind: 'clipping',
        sortKey: new Date(c.created_at).getTime(),
        data: c,
        ownerAvatarUrl: owner?.avatarUrl,
        ownerDisplayName: owner?.displayName ?? 'Village User',
        ownerUserId: c.user_id,
        ownerUsername: owner?.username,
      }
    })

    const villageRepostItems: FeedItem[] = villageReposts.map((c): RepostFeedItem => {
      const owner = villageUserMap.get(c.user_id)
      return {
        kind: 'repost',
        sortKey: new Date(c.created_at).getTime(),
        data: c,
        ownerAvatarUrl: owner?.avatarUrl,
        ownerDisplayName: owner?.displayName ?? 'Village User',
        ownerUserId: c.user_id,
        ownerUsername: owner?.username,
      }
    })

    const villageTakeRepostItems: FeedItem[] = villageTakeReposts.map((c): TakeRepostFeedItem => {
      const owner = villageUserMap.get(c.user_id)
      return {
        kind: 'take-repost',
        sortKey: new Date(c.created_at).getTime(),
        data: c,
        ownerAvatarUrl: owner?.avatarUrl,
        ownerDisplayName: owner?.displayName ?? 'Village User',
        ownerUserId: c.user_id,
        ownerUsername: owner?.username,
      }
    })

    const villageClippingRepostItems: FeedItem[] = villageClippingReposts.map((c): ClippingRepostFeedItem => {
      const owner = villageUserMap.get(c.user_id)
      return {
        kind: 'clipping-repost',
        sortKey: new Date(c.created_at).getTime(),
        data: c,
        ownerAvatarUrl: owner?.avatarUrl,
        ownerDisplayName: owner?.displayName ?? 'Village User',
        ownerUserId: c.user_id,
        ownerUsername: owner?.username,
      }
    })

    const takeItems: FeedItem[] = villageTakes.map((t): TakeFeedItem => {
      const owner = villageUserMap.get(t.user_id)
      return {
        kind: 'take',
        sortKey: new Date(t.created_at).getTime(),
        data: t,
        ownerAvatarUrl: owner?.avatarUrl,
        ownerDisplayName: owner?.displayName ?? 'Village User',
        ownerUserId: t.user_id,
        ownerUsername: owner?.username,
      }
    })

    return [...reviewItems, ...clippingItems, ...repostItems, ...takeRepostItems, ...clippingRepostItems, ...villageClippingItems, ...villageRepostItems, ...villageTakeRepostItems, ...villageClippingRepostItems, ...takeItems].sort((a, b) => b.sortKey - a.sortKey)
  }, [reviews, clippings, villageClippings, villageTakes, villageUserMap, profile?.avatar_url, profile?.display_name, profile?.username])

  // Filter watch notifications — clippings are always shown regardless
  const filteredItems = useMemo(
    () => preferences.showWatchNotifications
      ? feedItems
      : feedItems.filter((item) => {
          if (item.kind === 'clipping' || item.kind === 'repost' || item.kind === 'take' || item.kind === 'take-repost' || item.kind === 'clipping-repost') return true
          return item.data.type !== 'watch'
        }),
    [feedItems, preferences.showWatchNotifications],
  )

  const isInitialLoad = (isLoading || isListLoading) && page === 1 && reviews.length === 0

  useEffect(() => {
    spinnerProgress.value = withTiming(isRefreshing ? 1 : 0, {
      duration: isRefreshing ? 200 : 600,
    })
  }, [isRefreshing])

  const spinnerCollapseStyle = useAnimatedStyle(() => ({
    height: interpolate(spinnerProgress.value, [0, 1], [0, 52]),
    opacity: spinnerProgress.value,
  }))

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.kind === 'take') {
      const likeData = takeLikesMap.get(item.data.id)
      return (
        <TakeCard
          take={item.data}
          author={{
            avatarUrl: item.ownerAvatarUrl,
            displayName: item.ownerDisplayName,
            userId: item.ownerUserId,
            username: item.ownerUsername,
          }}
          initialLiked={likeData?.liked ?? false}
          initialLikeCount={likeData?.count ?? 0}
          initialCommentCount={takeCommentCounts.get(item.data.id) ?? 0}
          initialRepostCount={takeRepostStatus.get(item.data.id)?.count ?? 0}
          initialReposted={takeRepostStatus.get(item.data.id)?.reposted ?? false}
          readOnly
        />
      )
    }
    if (item.kind === 'repost') {
      return (
        <RepostCard
          clipping={item.data}
          owner={{ avatarUrl: item.ownerAvatarUrl, displayName: item.ownerDisplayName, userId: item.ownerUserId, username: item.ownerUsername }}
        />
      )
    }
    if (item.kind === 'clipping') {
      return (
        <ClippingCard
          clipping={item.data}
          onDeleted={removeClipping}
          user={{ avatarUrl: item.ownerAvatarUrl, displayName: item.ownerDisplayName, userId: item.ownerUserId, username: item.ownerUsername }}
          readOnly
        />
      )
    }
    if (item.kind === 'take-repost') {
      const isOwn = !item.ownerUserId
      return (
        <TakeRepostCard
          clipping={item.data}
          owner={{ avatarUrl: item.ownerAvatarUrl, displayName: item.ownerDisplayName, userId: item.ownerUserId, username: item.ownerUsername }}
          onDeleted={isOwn ? removeClipping : undefined}
        />
      )
    }
    if (item.kind === 'clipping-repost') {
      const isOwn = !item.ownerUserId
      return (
        <ClippingRepostCard
          clipping={item.data}
          owner={{ avatarUrl: item.ownerAvatarUrl, displayName: item.ownerDisplayName, userId: item.ownerUserId, username: item.ownerUsername }}
          onDeleted={isOwn ? removeClipping : undefined}
        />
      )
    }
    if (item.data.type === 'watch') {
      return <WatchNotification review={item.data} />
    }
    return <ReviewCard review={item.data} />
  }, [removeClipping, takeLikesMap, takeCommentCounts, takeRepostStatus])

  const renderEmpty = useCallback(() => {
    if (isLoading || isListLoading) return null

    if (usernames.length === 0) {
      return <FeedEmptyState />
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptySubtitle}>No activity found</Text>
      </View>
    )
  }, [isLoading, isListLoading, usernames.length, styles])

  const renderHeader = useCallback(() => {
    if (isInitialLoad) {
      return (
        <View>
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </View>
      )
    }
    return (
      <Animated.View style={[styles.spinnerCollapse, spinnerCollapseStyle]}>
        <View style={styles.refreshSpinner}>
          <Spinner size={20} />
        </View>
      </Animated.View>
    )
  }, [isInitialLoad, styles, spinnerCollapseStyle])

  const hasItems = filteredItems.length > 0

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <Spinner size={18} />
        </View>
      )
    }

    if (hasItems && !hasMore) {
      return <QuoteOfTheDay />
    }

    return null
  }, [isLoadingMore, hasItems, hasMore, styles])

  const splashHidden = useRef(false)
  const onContainerLayout = useCallback(() => {
    if (!splashHidden.current) {
      splashHidden.current = true
      SplashScreen.hideAsync()
    }
  }, [])

  const error = listError || feedError

  const listContentStyle = useMemo(
    () => [
      !hasItems && !isInitialLoad ? styles.emptyList : styles.list,
      { paddingTop: headerHeight + spacing.md, paddingBottom: tabBarInset + 20 },
    ],
    [hasItems, isInitialLoad, styles, headerHeight, tabBarInset],
  )

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      {error && (
        <ErrorBanner message={error} onDismiss={clearError} />
      )}

      <Animated.FlatList
        ref={flatListRef}
        key={layoutKey}
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={11}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        }
        contentContainerStyle={listContentStyle}
      />

      {/* Header: outer shell stays opaque, inner content fades on scroll */}
      <Animated.View
        onLayout={onHeaderLayout}
        style={[styles.header, { paddingTop: insets.top + 6 }, headerAnimatedStyle]}
      >
        <Animated.View style={[styles.headerContent, headerContentOpacity]}>
          <DrawerTrigger onPress={openDrawer} />
          <Pressable
            onPress={() => {
              headerTranslateY.value = withTiming(0, { duration: 200 })
              translateY.value = withTiming(0, { duration: 200 })
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
            }}
            hitSlop={8}
          >
            <LogoIcon size={28} fill={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('UserSearch')}
            style={styles.searchButton}
            hitSlop={8}
          >
            <Ionicons name="search-outline" size={20} color={colors.foreground} />
          </Pressable>
        </Animated.View>
      </Animated.View>
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
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: 6,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      zIndex: 1,
    },
    headerContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    searchButton: {
      width: 60,
      alignItems: 'flex-end',
    },
    list: {},
    emptyList: {
      flexGrow: 1,
    },
    spinnerCollapse: {
      overflow: 'hidden',
    },
    refreshSpinner: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.title1.fontSize,
      lineHeight: typography.title1.lineHeight,
      color: colors.foreground,
      marginBottom: spacing.sm,
    },
    emptySubtitle: {
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.secondaryText,
      textAlign: 'center',
    },
    footerLoader: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
  })
}
