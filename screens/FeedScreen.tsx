import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  useAnimatedScrollHandler,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, DrawerActions } from '@react-navigation/native'
import { useUserLists } from '@/hooks/useUserLists'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useTabBar } from '@/contexts/TabBarContext'
import { fetchFeed, type FeedResult } from '@/services/feed'
import type { Review } from '@/types/database'
import { colors, fonts, spacing, typography } from '@/theme'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ReviewCard from '@/components/ReviewCard'
import WatchNotification from '@/components/WatchNotification'
import QuoteOfTheDay from '@/components/QuoteOfTheDay'

const TAB_BAR_HEIGHT = 80
const SCROLL_THRESHOLD = 10

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { users, usernames, isLoading: isListLoading, error: listError, clearError } = useUserLists()
  const { preferences } = useDisplayPreferences()
  const { translateY } = useTabBar()

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event, ctx: { prevY: number }) => {
      const currentY = event.contentOffset.y
      const diff = currentY - ctx.prevY

      if (currentY <= 0) {
        // At the top — always show
        translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) })
      } else if (diff > SCROLL_THRESHOLD) {
        // Scrolling down — hide
        translateY.value = withTiming(TAB_BAR_HEIGHT, { duration: 200, easing: Easing.out(Easing.ease) })
      } else if (diff < -SCROLL_THRESHOLD) {
        // Scrolling up — show
        translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) })
      }

      ctx.prevY = currentY
    },
    onBeginDrag: (event, ctx: { prevY: number }) => {
      ctx.prevY = event.contentOffset.y
    },
  })

  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)

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

  // Reload feed when usernames change
  useEffect(() => {
    if (!isListLoading) {
      loadFeed(1)
    }
  }, [usernames, isListLoading, loadFeed])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    loadFeed(1)
  }, [loadFeed])

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadFeed(page + 1, true)
    }
  }, [hasMore, isLoading, page, loadFeed])

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer())
  }, [navigation])

  // Filter watch notifications if preference is set
  const filteredReviews = preferences.hideWatchNotifications
    ? reviews.filter((r) => r.type !== 'watch')
    : reviews

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.header}>
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
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={styles.headerSpacer} />
      </View>

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
          contentContainerStyle={filteredReviews.length === 0 ? styles.emptyList : styles.list}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: typography.title3.fontSize,
    color: colors.foreground,
  },
  headerSpacer: {
    width: 60,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
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
