import { memo, useMemo, useCallback, useRef } from 'react'
import { LayoutAnimation, StyleSheet, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { Clipping, Review } from '@/types/database'
import type { FeedStackParamList } from '@/navigation/types'
import { deleteClipping, saveRepost } from '@/services/clippings'
import { useClippingRepost, publishClippingRepostStatus } from '@/hooks/useClippingRepostCount'
import { useTheme } from '@/contexts/ThemeContext'
import { type ThemeColors } from '@/theme'
import ReviewCard from '@/components/ReviewCard'
import RepostHeader from '@/components/feed/RepostHeader'
import SwipeableRow from '@/components/ui/SwipeableRow'
import ClippingInteractionBar from '@/components/ClippingInteractionBar'

interface RepostCardProps {
  clipping: Clipping
  owner: {
    avatarUrl?: string
    displayName: string
    userId?: string
    username?: string
  }
  /** Called after a successful delete — removes from parent list state. */
  onDeleted?: (id: string) => void
  initialLiked?: boolean
  initialLikeCount?: number
  initialCommentCount?: number
  initialRepostCount?: number
  initialReposted?: boolean
}

function RepostCard({ clipping, owner, onDeleted, initialLiked, initialLikeCount, initialCommentCount, initialRepostCount, initialReposted }: RepostCardProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const review = clipping.review_json as Review

  const { reposted, count: repostCount } = useClippingRepost(clipping.original_url, initialReposted, initialRepostCount)
  const isReposting = useRef(false)

  const handleRepost = useCallback(async () => {
    if (isReposting.current || reposted) return
    isReposting.current = true
    const prevReposted = reposted
    const prevCount = repostCount
    publishClippingRepostStatus(clipping.original_url, { reposted: true, count: prevCount + 1 })
    try {
      await saveRepost(review, clipping.tmdb_id)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost:', error)
      publishClippingRepostStatus(clipping.original_url, { reposted: prevReposted, count: prevCount })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      isReposting.current = false
    }
  }, [review, clipping, reposted, repostCount])

  const handleDetailPress = useCallback(() => {
    navigation.navigate('ClippingDetail', { clipping, owner })
  }, [navigation, clipping, owner])

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onDeleted?.(clipping.id)
    deleteClipping(clipping.id).catch((error) => {
      console.error('Failed to delete repost:', error)
    })
  }, [clipping.id, onDeleted])

  const cardContent = (
    <View style={styles.surface}>
      <RepostHeader owner={owner} />
      <ReviewCard
        review={review}
        repostable={false}
        compact
        footer={
          <ClippingInteractionBar
            clipping={clipping}
            owner={owner}
            onCommentPress={handleDetailPress}
            onRepostPress={handleRepost}
            initialLiked={initialLiked}
            initialLikeCount={initialLikeCount}
            initialCommentCount={initialCommentCount}
            initialRepostCount={initialRepostCount}
            initialReposted={initialReposted}
            style={styles.interactionBar}
          />
        }
      />
    </View>
  )

  // Others' reposts: swipe-to-repost
  if (!onDeleted) {
    return (
      <SwipeableRow
        onAction={handleRepost}
        actionColor={colors.teal}
        actionIcon="repeat-outline"
        actionLabel="Repost this review"
      >
        {cardContent}
      </SwipeableRow>
    )
  }

  // Own repost: swipe-to-delete
  return (
    <SwipeableRow
      onAction={handleDelete}
      actionColor={colors.red}
      actionIcon="trash-outline"
      actionLabel="Delete repost"
    >
      {cardContent}
    </SwipeableRow>
  )
}

export default memo(RepostCard)

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    surface: {
      backgroundColor: colors.background,
    },
    interactionBar: {
      marginTop: 0,
      marginBottom: 0,
    },
  })
}
