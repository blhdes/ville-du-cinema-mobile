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
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as SplashScreen from 'expo-splash-screen'
import type { FeedStackParamList } from '@/navigation/types'
import { useUserLists } from '@/hooks/useUserLists'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useTabBar } from '@/contexts/TabBarContext'
import { useTheme } from '@/contexts/ThemeContext'
import { fetchFeed, clearFeedCache, refreshAvatarUrls, type FeedResult } from '@/services/feed'
import { hydrateAvatarCache } from '@/services/avatarCache'
import type { Review } from '@/types/database'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ReviewCard from '@/components/ReviewCard'
import ReviewCardSkeleton from '@/components/feed/ReviewCardSkeleton'
import WatchNotification from '@/components/WatchNotification'
import QuoteOfTheDay from '@/components/QuoteOfTheDay'
import Spinner from '@/components/ui/Spinner'
import LogoIcon from '@/components/ui/LogoIcon'

// Deadzone: header only starts hiding after this many px of continuous downward scroll.
// Scrolling up has 0px threshold — the header reveals immediately.
const DOWN_DEADZONE = 8

// Scroll positions below this are a "safe zone" — the tab bar always snaps back to
// visible so users who just opened the app can switch tabs freely.
const TOP_THRESHOLD = 250

// Spring config for snap animations — relaxed, deliberate settling for an editorial feel.
const SNAP_SPRING = { damping: 24, stiffness: 120, mass: 1.0, overshootClamping: true }

const keyExtractor = (item: Review) => item.id

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const tabBarMax = tabBarHeight + insets.bottom
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>()
  const { users, usernames, isLoading: isListLoading, error: listError, clearError } = useUserLists()
  const { preferences } = useDisplayPreferences()
  const { translateY, feedRefreshRequested, setIsFeedRefreshing } = useTabBar()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  // Header hide/show
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerTranslateY = useSharedValue(0)
  const downAccumulator = useSharedValue(0)
  const isDragging = useSharedValue(false)
  const scrollY = useSharedValue(0)
  const lastScrollDirection = useSharedValue(0)
  const spinnerProgress = useSharedValue(1)

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
    // Top safe zone — always animate back to fully visible.
    if (currentScrollY < TOP_THRESHOLD) {
      translateY.value = withSpring(0, SNAP_SPRING)
      headerTranslateY.value = withSpring(0, SNAP_SPRING)
      return
    }

    if (lastScrollDirection.value > 0) {
      // Was scrolling DOWN → snap fully hidden.
      translateY.value = withSpring(tabBarMax, SNAP_SPRING)
      headerTranslateY.value = withSpring(-headerHeight, SNAP_SPRING)
    } else {
      // Was scrolling UP → only lock visible if the user scrolled hard enough
      // to fully reveal the bar (translateY ≈ 0). Otherwise snap back to hidden.
      if (translateY.value < 1) {
        translateY.value = withSpring(0, SNAP_SPRING)
        headerTranslateY.value = withSpring(0, SNAP_SPRING)
      } else {
        translateY.value = withSpring(tabBarMax, SNAP_SPRING)
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
          tabBarMax,
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
          tabBarMax,
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

  // Reset tab bar + header when leaving FeedScreen (fixes stuck-hidden bug on screen transitions).
  useFocusEffect(
    useCallback(() => {
      return () => {
        translateY.value = withTiming(0, { duration: 200 })
        headerTranslateY.value = withTiming(0, { duration: 200 })
      }
    }, [translateY, headerTranslateY])
  )

  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)

  const flatListRef = useRef<Animated.FlatList<Review>>(null)
  const [cacheReady, setCacheReady] = useState(false)

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
        loadFeed(1, false, true)
        if (usernames.length > 0) {
          refreshAvatarUrls(usernames).catch(() => {})
        }
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
  const filteredReviews = useMemo(
    () => preferences.showWatchNotifications
      ? reviews
      : reviews.filter((r) => r.type !== 'watch'),
    [reviews, preferences.showWatchNotifications],
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

  const renderItem = useCallback(({ item }: { item: Review }) => {
    if (item.type === 'watch') {
      return <WatchNotification review={item} />
    }
    return <ReviewCard review={item} />
  }, [])

  const renderEmpty = useCallback(() => {
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

  const hasReviews = filteredReviews.length > 0

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <Spinner size={18} />
        </View>
      )
    }

    if (hasReviews && !hasMore) {
      return <QuoteOfTheDay />
    }

    return null
  }, [isLoadingMore, hasReviews, hasMore, styles])

  const splashHidden = useRef(false)
  const onContainerLayout = useCallback(() => {
    if (!splashHidden.current) {
      splashHidden.current = true
      SplashScreen.hideAsync()
    }
  }, [])

  const error = listError || feedError

  const listContentStyle = useMemo(
    () => !hasReviews && !isInitialLoad
      ? styles.emptyList
      : [styles.list, { paddingTop: headerHeight + spacing.md, paddingBottom: tabBarHeight + 20 }],
    [hasReviews, isInitialLoad, styles, headerHeight, tabBarHeight],
  )

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      {error && (
        <ErrorBanner message={error} onDismiss={clearError} />
      )}

      <Animated.FlatList
        ref={flatListRef}
        key={layoutKey}
        data={filteredReviews}
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
        style={[styles.header, { paddingTop: insets.top + 12 }, headerAnimatedStyle]}
      >
        <Animated.View style={[styles.headerContent, headerContentOpacity]}>
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
          <Pressable
            onPress={() => {
              headerTranslateY.value = withTiming(0, { duration: 200 })
              translateY.value = withTiming(0, { duration: 200 })
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
            }}
            hitSlop={8}
          >
            <LogoIcon size={40} fill={colors.foreground} />
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

function createStyles(colors: ThemeColors) {
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
      paddingBottom: 12,
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
}
