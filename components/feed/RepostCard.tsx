import { memo, useMemo, useCallback } from 'react'
import { LayoutAnimation, StyleSheet, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import type { Clipping, Review } from '@/types/database'
import { deleteClipping, saveRepost } from '@/services/clippings'
import { useTheme } from '@/contexts/ThemeContext'
import { type ThemeColors } from '@/theme'
import ReviewCard from '@/components/ReviewCard'
import RepostHeader from '@/components/feed/RepostHeader'
import SwipeableRow from '@/components/ui/SwipeableRow'

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
}

function RepostCard({ clipping, owner, onDeleted }: RepostCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const review = clipping.review_json as Review

  const handleRepost = useCallback(async () => {
    try {
      await saveRepost(review, clipping.tmdb_id)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [review, clipping.tmdb_id])

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
      <ReviewCard review={review} repostable={false} compact />
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
  })
}
