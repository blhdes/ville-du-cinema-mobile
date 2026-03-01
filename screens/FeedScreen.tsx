import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUserLists } from '@/hooks/useUserLists'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { fetchFeed, type FeedResult } from '@/services/feed'
import type { Review } from '@/types/database'
import { colors, fonts, spacing } from '@/theme'
import SectionHeader from '@/components/ui/SectionHeader'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ReviewCard from '@/components/ReviewCard'
import WatchNotification from '@/components/WatchNotification'
import QuoteOfTheDay from '@/components/QuoteOfTheDay'
import UserListPanel from '@/components/UserListPanel'

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const { users, usernames, isLoading: isListLoading, error: listError, addUser, removeUser, isAuthenticated, clearError } = useUserLists()
  const { preferences } = useDisplayPreferences()

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
          <Text style={styles.emptyTitle}>VILLAGE DU CINEMA</Text>
          <Text style={styles.emptySubtitle}>
            Add Letterboxd users above to see their recent activity
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
          <ActivityIndicator size="small" color={colors.black} />
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
      <SectionHeader title="FEED" />

      {error && (
        <ErrorBanner message={error} onDismiss={clearError} />
      )}

      <UserListPanel
        users={users}
        isAuthenticated={isAuthenticated}
        onAdd={addUser}
        onRemove={removeUser}
      />

      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.black} />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.black}
              colors={[colors.black]}
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
    backgroundColor: colors.cream,
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
    fontSize: 14,
    color: colors.sepia,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.black,
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.bodyItalic,
    fontSize: 16,
    color: colors.sepia,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
})
