import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Review } from '@/types/database'
import {
  fetchExternalProfileMeta,
  clearProfileCache,
  type ExternalProfileMeta,
} from '@/services/externalProfile'
import { fetchUserFeed, clearFeedCache } from '@/services/feed'
import { useAvatarUrl } from '@/services/avatarCache'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useUserLists } from '@/hooks/useUserLists'
import { colors, fonts, spacing, typography } from '@/theme'
import Spinner from '@/components/ui/Spinner'
import ErrorBanner from '@/components/ui/ErrorBanner'
import ExternalProfileHeader from '@/components/profile/ExternalProfileHeader'
import ReviewCard from '@/components/ReviewCard'
import WatchNotification from '@/components/WatchNotification'

type ExternalProfileRoute = RouteProp<FeedStackParamList, 'ExternalProfile'>

export default function ExternalProfileScreen() {
  const { params } = useRoute<ExternalProfileRoute>()
  const { username } = params

  const avatarUrl = useAvatarUrl(username)
  const { preferences } = useDisplayPreferences()
  const { usernames, addUser, removeUser } = useUserLists()
  const isFollowing = usernames.includes(username)

  const [reviews, setReviews] = useState<Review[]>([])
  const [meta, setMeta] = useState<ExternalProfileMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    setError(null)

    const [feedResult, metaResult] = await Promise.allSettled([
      fetchUserFeed(username),
      fetchExternalProfileMeta(username),
    ])

    if (feedResult.status === 'fulfilled') {
      setReviews(feedResult.value)
    }
    if (metaResult.status === 'fulfilled') {
      setMeta(metaResult.value)
    }

    // Both failed → show error
    if (feedResult.status === 'rejected' && metaResult.status === 'rejected') {
      setError('Failed to load profile')
    }
  }, [username])

  useEffect(() => {
    setIsLoading(true)
    loadData().finally(() => setIsLoading(false))
  }, [loadData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    clearProfileCache()
    clearFeedCache()
    await loadData()
    setRefreshing(false)
  }, [loadData])

  const filteredReviews = preferences.showWatchNotifications
    ? reviews
    : reviews.filter((r) => r.type !== 'watch')

  const renderItem = useCallback(({ item }: { item: Review }) => {
    if (item.type === 'watch') {
      return <WatchNotification review={item} hideAuthor />
    }
    return <ReviewCard review={item} hideAuthor />
  }, [])

  const handleFollowToggle = useCallback(() => {
    if (isFollowing) {
      removeUser(username)
    } else {
      addUser(username)
    }
  }, [isFollowing, username, addUser, removeUser])

  const headerComponent = useMemo(() => {
    const displayName = meta?.displayName || username
    return (
      <>
        {refreshing && (
          <View style={styles.refreshSpinner}>
            <Spinner size={18} />
          </View>
        )}
        <ExternalProfileHeader
          displayName={displayName}
          username={username}
          bio={meta?.bio ?? ''}
          avatarUrl={avatarUrl}
          location={meta?.location}
          websiteUrl={meta?.websiteUrl}
          websiteLabel={meta?.websiteLabel}
          twitterHandle={meta?.twitterHandle}
          twitterUrl={meta?.twitterUrl}
          favoriteFilms={meta?.favoriteFilms}
          isFollowing={isFollowing}
          onFollowToggle={handleFollowToggle}
        />
      </>
    )
  }, [meta, username, avatarUrl, refreshing, isFollowing, handleFollowToggle])

  const renderEmpty = useCallback(() => {
    if (isLoading) return null
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No activity yet</Text>
      </View>
    )
  }, [isLoading])

  // Loading state — centered spinner (same pattern as ProfileScreen)
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Spinner size={24} />
        </View>
      </View>
    )
  }

  // Error state — both fetches failed
  if (error && reviews.length === 0 && !meta) {
    return (
      <View style={styles.container}>
        <ErrorBanner message={error} />
        <View style={styles.fallbackContainer}>
          <Pressable
            onPress={() =>
              Linking.openURL(`https://letterboxd.com/${username}/`)
            }
          >
            <Text style={styles.fallbackLink}>View on Letterboxd</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {error && <ErrorBanner message={error} />}
      <FlatList
        data={filteredReviews}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="transparent"
          />
        }
        contentContainerStyle={
          filteredReviews.length === 0 ? styles.emptyList : styles.list
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  list: {
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.secondaryText,
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLink: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.teal,
  },
})
