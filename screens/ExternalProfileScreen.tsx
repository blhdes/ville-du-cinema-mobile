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
import { fetchUserFeed, clearFeedCache } from '@/services/feed'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useUserLists } from '@/hooks/useUserLists'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
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

  const { preferences } = useDisplayPreferences()
  const { usernames, addUser, removeUser } = useUserLists()
  const isFollowing = usernames.includes(username)
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Display name from the first RSS item's dc:creator field
  const displayName = reviews[0]?.creator || username

  const loadData = useCallback(async () => {
    setError(null)

    try {
      const feed = await fetchUserFeed(username)
      setReviews(feed)
    } catch {
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
          isFollowing={isFollowing}
          onFollowToggle={handleFollowToggle}
        />
      </>
    )
  }, [isLoading, displayName, username, refreshing, isFollowing, handleFollowToggle, styles])

  const renderEmpty = useCallback(() => {
    if (isLoading) return null
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No activity yet</Text>
      </View>
    )
  }, [isLoading, styles])

  // Error state — both fetches failed
  if (error && reviews.length === 0) {
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
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={9}
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

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
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
      fontFamily: fonts.system,
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
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.teal,
    },
  })
}
