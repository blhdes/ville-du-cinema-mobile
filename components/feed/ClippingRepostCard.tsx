import { memo, useMemo, useCallback, useRef } from 'react'
import { LayoutAnimation, StyleSheet, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import type { Clipping, ClippingRepostJson, RepostAuthor } from '@/types/database'
import { deleteClipping, saveRepostClipping } from '@/services/clippings'
import { useClippingRepost, publishClippingRepostStatus } from '@/hooks/useClippingRepostCount'
import { useTheme } from '@/contexts/ThemeContext'
import { type ThemeColors } from '@/theme'
import ClippingCard from '@/components/profile/ClippingCard'
import RepostHeader from '@/components/feed/RepostHeader'
import SwipeableRow from '@/components/ui/SwipeableRow'

interface ClippingRepostCardProps {
  clipping: Clipping
  owner: {
    avatarUrl?: string
    displayName: string
    userId?: string
    username?: string
  }
  /** Called after a successful delete — removes from parent list state. */
  onDeleted?: (id: string) => void
  initialRepostCount?: number
  initialReposted?: boolean
}

function ClippingRepostCard({ clipping, owner, onDeleted, initialRepostCount, initialReposted }: ClippingRepostCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  // Support both new format { clipping, user } and legacy bare Clipping stored before the metadata fix
  const json = clipping.review_json as ClippingRepostJson | Clipping | null
  const originalClipping: Clipping = (json && 'clipping' in json) ? (json as ClippingRepostJson).clipping : (json as Clipping)
  const originalUserRaw: RepostAuthor | undefined = (json && 'user' in json) ? (json as ClippingRepostJson).user : undefined
  // Fall back to the clipping's own user_id for old data where userId wasn't stored
  const originalUser: RepostAuthor | undefined = originalUserRaw
    ? { ...originalUserRaw, userId: originalUserRaw.userId ?? originalClipping.user_id }
    : undefined

  const { reposted, count: repostCount } = useClippingRepost(originalClipping.original_url, initialReposted, initialRepostCount)
  const isReposting = useRef(false)

  const handleRepost = useCallback(async () => {
    if (isReposting.current || reposted) return
    isReposting.current = true
    const prevReposted = reposted
    const prevCount = repostCount
    publishClippingRepostStatus(originalClipping.original_url, { reposted: true, count: reposted ? prevCount : prevCount + 1 })
    try {
      await saveRepostClipping(originalClipping, originalUser)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost clipping:', error)
      publishClippingRepostStatus(originalClipping.original_url, { reposted: prevReposted, count: prevCount })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      isReposting.current = false
    }
  }, [originalClipping, originalUser, reposted, repostCount])

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onDeleted?.(clipping.id)
    deleteClipping(clipping.id).catch((error) => {
      console.error('Failed to delete clipping repost:', error)
    })
  }, [clipping.id, onDeleted])

  const cardContent = (
    <View style={styles.surface}>
      <RepostHeader owner={owner} repostCount={repostCount} reposted={reposted} />
      <ClippingCard clipping={originalClipping} user={originalUser} readOnly repostable={false} initialRepostCount={initialRepostCount} initialReposted={initialReposted} />
    </View>
  )

  // Others' clipping reposts: swipe-to-repost
  if (!onDeleted) {
    return (
      <SwipeableRow
        onAction={handleRepost}
        actionColor={colors.teal}
        actionIcon="repeat-outline"
        actionLabel="Repost this clipping"
      >
        {cardContent}
      </SwipeableRow>
    )
  }

  // Own clipping repost: swipe-to-delete
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

export default memo(ClippingRepostCard)

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    surface: {
      backgroundColor: colors.background,
    },
  })
}
