import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type LayoutChangeEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation, DrawerActions } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import type { FeedStackParamList } from '@/navigation/types'
import { useUserLists } from '@/hooks/useUserLists'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useTabBar } from '@/contexts/TabBarContext'
import { fetchFeed, clearFeedCache, refreshAvatarUrls, type FeedResult } from '@/services/feed'
import { hydrateAvatarCache } from '@/services/avatarCache'
import type { Review } from '@/types/database'
import { colors, fonts, spacing, typography } from '@/theme'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ReviewCard from '@/components/ReviewCard'
import WatchNotification from '@/components/WatchNotification'
import QuoteOfTheDay from '@/components/QuoteOfTheDay'
import Spinner from '@/components/ui/Spinner'
import LogoIcon from '@/components/ui/LogoIcon'

// Deadzone: header only starts hiding after this many px of continuous downward scroll.
// Scrolling up has 0px threshold — the header reveals immediately.
const DOWN_DEADZONE = 8

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const tabBarMax = tabBarHeight + insets.bottom
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>()
  const { users, usernames, isLoading: isListLoading, error: listError, clearError } = useUserLists()
  const { preferences } = useDisplayPreferences()
  const { translateY, feedRefreshRequested, setIsFeedRefreshing } = useTabBar()

  // Header hide/show
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerTranslateY = useSharedValue(0)
  const downAccumulator = useSharedValue(0)

  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setHeaderHeight(e.nativeEvent.layout.height)
  }, [])

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    opacity: interpolate(
      headerTranslateY.value,
      [-headerHeight, 0],
      [0, 1],
    ),
  }))

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event, ctx: { prevY: number }) => {
      const currentY = event.contentOffset.y
      const delta = currentY - ctx.prevY
      ctx.prevY = currentY

      if (currentY <= 0) {
        // At the top — always fully visible
        headerTranslateY.value = 0
        translateY.value = 0
        downAccumulator.value = 0
        return
      }

      if (delta > 0) {
        // Scrolling down — apply deadzone, then 1:1
        downAccumulator.value += delta
        if (downAccumulator.value > DOWN_DEADZONE) {
          headerTranslateY.value = Math.max(
            -headerHeight,
            Math.min(0, headerTranslateY.value - delta),
          )
          translateY.value = Math.min(
            tabBarMax,
            Math.max(0, translateY.value + delta),
          )
        }
      } else if (delta < 0) {
        // Scrolling up — immediate 1:1 (0px threshold)
        downAccumulator.value = 0
        headerTranslateY.value = Math.max(
          -headerHeight,
          Math.min(0, headerTranslateY.value - delta),
        )
        translateY.value = Math.min(
          tabBarMax,
          Math.max(0, translateY.value + delta),
        )
      }
    },
    onBeginDrag: (event, ctx: { prevY: number }) => {
      ctx.prevY = event.contentOffset.y
      downAccumulator.value = 0
    },
  })

  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)

  const flatListRef = useRef<Animated.FlatList<Review>>(null)
  const [cacheReady, setCacheReady] = useState(false)
  const splashHidden = useRef(false)

  // Hydrate the avatar cache from AsyncStorage before loading the feed
  useEffect(() => {
    hydrateAvatarCache().then(() => setCacheReady(true))
  }, [])

  const loadFeed = useCallback(async (pageNum: number, append = false, keepContent = false) => {
    if (usernames.length === 0) {
      setReviews([])
      setHasMore(false)
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

  const hideSplash = useCallback(() => {
    if (!splashHidden.current) {
      splashHidden.current = true
      SplashScreen.hideAsync()
    }
  }, [])

  // Hide splash once loading finishes (runs after React renders the loaded state)
  useEffect(() => {
    if (!isLoading && !isListLoading) {
      hideSplash()
    }
  }, [isLoading, isListLoading, hideSplash])

  // Safety: hide splash after 5s no matter what, so users aren't stuck
  useEffect(() => {
    const timer = setTimeout(hideSplash, 5000)
    return () => clearTimeout(timer)
  }, [hideSplash])

  // Wait for cache hydration + user list before loading the feed.
  // fetchUserFeed already scrapes any missing avatars, so no extra refresh needed here.
  useEffect(() => {
    if (!isListLoading && cacheReady) {
      loadFeed(1)
    }
  }, [usernames, isListLoading, cacheReady, loadFeed])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    clearFeedCache()
    loadFeed(1)
    // Background-refresh avatar URLs on pull-to-refresh
    if (usernames.length > 0) {
      refreshAvatarUrls(usernames).catch(() => {})
    }
  }, [loadFeed, usernames])

  // Refresh feed when the Feed tab icon is tapped while already on Feed:
  // scroll to top, reveal header + tab bar, show the RefreshControl spinner, keep existing content
  useEffect(() => {
    if (feedRefreshRequested > 0) {
      // Scroll the list to the top
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true })

      // Reveal the header and tab bar
      headerTranslateY.value = withTiming(0, { duration: 200 })
      translateY.value = withTiming(0, { duration: 200 })

      // Trigger refresh but keep cached content visible (keepContent = true)
      setIsFeedRefreshing(true)
      setIsRefreshing(true)
      clearFeedCache()
      loadFeed(1, false, true)
      if (usernames.length > 0) {
        refreshAvatarUrls(usernames).catch(() => {})
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

  // Filter watch notifications if preference is set
  const filteredReviews = preferences.showWatchNotifications
    ? reviews
    : reviews.filter((r) => r.type !== 'watch')

  const renderItem = useCallback(({ item }: { item: Review }) => {
    if (item.type === 'watch') {
      return <WatchNotification review={item} />
    }
    return <ReviewCard review={item} />
  }, [])

  const renderEmpty = () => {
    if (isLoading || isListLoading) return null

    if (usernames.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Village du Cin{'\u00E9'}ma</Text>
          <Text style={styles.emptySubtitle}>
            Tap the Users button to add Letterboxd accounts and see their recent activity.
          </Text>
          <QuoteOfTheDay />
        </View>
      )
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptySubtitle}>No activity found</Text>
      </View>
    )
  }

  const renderHeader = () => {
    if (!isRefreshing) return null
    return (
      <View style={styles.refreshSpinner}>
        <Spinner size={20} />
      </View>
    )
  }

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <Spinner size={18} />
        </View>
      )
    }

    if (filteredReviews.length > 0 && !hasMore) {
      return <QuoteOfTheDay />
    }

    return null
  }

  const error = listError || feedError

  return (
    <View style={styles.container}>
      {error && (
        <ErrorBanner message={error} onDismiss={clearError} />
      )}

      {isLoading && page === 1 && reviews.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Spinner size={24} />
        </View>
      ) : (
        <Animated.FlatList
          ref={flatListRef}
          key={layoutKey}
          data={filteredReviews}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="transparent"
              colors={['transparent']}
            />
          }
          contentContainerStyle={
            filteredReviews.length === 0
              ? styles.emptyList
              : [styles.list, { paddingTop: headerHeight + spacing.md, paddingBottom: tabBarHeight + 20 }]
          }
        />
      )}

      {/* Header floats above content so it can slide out of view */}
      <Animated.View
        onLayout={onHeaderLayout}
        style={[styles.header, { paddingTop: insets.top + 12 }, headerAnimatedStyle]}
      >
        <Pressable
          onPress={openDrawer}
          style={styles.usersButton}
          hitSlop={8}
        >
          <Text style={styles.usersButtonText}>Users</Text>
          {users.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{users.length}</Text>
            </View>
          )}
        </Pressable>
        <LogoIcon size={40} fill={colors.foreground} />
        <Pressable
          onPress={() => navigation.navigate('UserSearch')}
          style={styles.searchButton}
          hitSlop={8}
        >
          <Ionicons name="search-outline" size={20} color={colors.foreground} />
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
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
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 1,
  },
  usersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  usersButtonText: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.blue,
  },
  badge: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.secondaryText,
  },
  searchButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  list: {},
  emptyList: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: fonts.body,
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
