import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
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
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation, DrawerActions } from '@react-navigation/native'
import { useUserLists } from '@/hooks/useUserLists'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useTabBar } from '@/contexts/TabBarContext'
import { fetchFeed, refreshAvatarUrls, type FeedResult } from '@/services/feed'
import { hydrateAvatarCache } from '@/services/avatarCache'
import type { Review } from '@/types/database'
import { colors, fonts, spacing, typography } from '@/theme'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ReviewCard from '@/components/ReviewCard'
import WatchNotification from '@/components/WatchNotification'
import QuoteOfTheDay from '@/components/QuoteOfTheDay'
import LogoIcon from '@/components/ui/LogoIcon'

// Deadzone: header only starts hiding after this many px of continuous downward scroll.
// Scrolling up has 0px threshold — the header reveals immediately.
const DOWN_DEADZONE = 8

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const tabBarMax = tabBarHeight + insets.bottom
  const navigation = useNavigation()
  const { users, usernames, isLoading: isListLoading, error: listError, clearError } = useUserLists()
  const { preferences } = useDisplayPreferences()
  const { translateY } = useTabBar()

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
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)

  const [cacheReady, setCacheReady] = useState(false)

  // Hydrate the avatar cache from AsyncStorage before loading the feed
  useEffect(() => {
    hydrateAvatarCache().then(() => setCacheReady(true))
  }, [])

  const loadFeed = useCallback(async (pageNum: number, append = false) => {
    if (usernames.length === 0) {
      setReviews([])
      setHasMore(false)
      return
    }

    if (!append) setIsLoading(true)
    setFeedError(null)

    try {
      const result: FeedResult = await fetchFeed(usernames, pageNum)

      if (append) {
        setReviews((prev) => [...prev, ...result.reviews])
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
    }
  }, [usernames])

  // Wait for cache hydration + user list before loading the feed.
  // fetchUserFeed already scrapes any missing avatars, so no extra refresh needed here.
  useEffect(() => {
    if (!isListLoading && cacheReady) {
      loadFeed(1)
    }
  }, [usernames, isListLoading, cacheReady, loadFeed])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    loadFeed(1)
    // Background-refresh avatar URLs on pull-to-refresh
    if (usernames.length > 0) {
      refreshAvatarUrls(usernames).catch(() => {})
    }
  }, [loadFeed, usernames])

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadFeed(page + 1, true)
    }
  }, [hasMore, isLoading, page, loadFeed])

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer())
  }, [navigation])

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

  const renderFooter = () => {
    if (isLoading && page > 1) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.secondaryText} />
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

      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondaryText} />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredReviews}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
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
              tintColor={colors.secondaryText}
              colors={[colors.secondaryText]}
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
        <View style={styles.headerSpacer} />
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
  headerSpacer: {
    width: 60,
  },
  list: {},
  emptyList: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    color: colors.secondaryText,
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
