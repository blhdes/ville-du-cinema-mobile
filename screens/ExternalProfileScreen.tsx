import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  InteractionManager,
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
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import ErrorBanner from '@/components/ui/ErrorBanner'
import Spinner from '@/components/ui/Spinner'
import ExternalProfileHeader from '@/components/profile/ExternalProfileHeader'
import ProfileSkeleton from '@/components/profile/ProfileSkeleton'
import ReviewCard from '@/components/ReviewCard'
import WatchNotification from '@/components/WatchNotification'

type ExternalProfileRoute = RouteProp<FeedStackParamList, 'ExternalProfile'>

const keyExtractor = (item: Review) => item.id

export default function ExternalProfileScreen() {
  const { params } = useRoute<ExternalProfileRoute>()
  const { username } = params

  const avatarUrl = useAvatarUrl(username)
  const { preferences } = useDisplayPreferences()
  const { usernames, addUser, removeUser } = useUserLists()
  const isFollowing = usernames.includes(username)
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

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

  // Defer the initial fetch until the push animation finishes so heavy
  // XML/HTML parsing doesn't compete with the animation for the JS thread.
  // The ProfileSkeleton covers the wait, so there's no visual gap.
  const isMounted = useRef(true)
  useEffect(() => () => { isMounted.current = false }, [])

  useEffect(() => {
    setIsLoading(true)
    const task = InteractionManager.runAfterInteractions(() => {
      loadData().finally(() => {
        if (isMounted.current) setIsLoading(false)
      })
    })
    return () => task.cancel()
  }, [loadData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    clearProfileCache()
    clearFeedCache()
    await loadData()
    setRefreshing(false)
  }, [loadData])

  const filteredReviews = useMemo(
    () => preferences.showWatchNotifications
      ? reviews
      : reviews.filter((r) => r.type !== 'watch'),
    [reviews, preferences.showWatchNotifications],
  )

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
    if (isLoading) {
      return <ProfileSkeleton variant="external" />
    }

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
  }, [isLoading, meta, username, avatarUrl, refreshing, isFollowing, handleFollowToggle, styles])

  const renderEmpty = useCallback(() => {
    if (isLoading) return null
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No activity yet</Text>
      </View>
    )
  }, [isLoading, styles])

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
        keyExtractor={keyExtractor}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
}
