import { memo, useMemo, useCallback, useRef } from 'react'
import { LayoutAnimation, StyleSheet, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import type { Clipping, Take, TakeRepostJson, RepostAuthor } from '@/types/database'
import { deleteClipping, saveRepostTake } from '@/services/clippings'
import { useRepost } from '@/hooks/useRepostCount'
import { useTheme } from '@/contexts/ThemeContext'
import { type ThemeColors } from '@/theme'
import TakeCard from '@/components/TakeCard'
import RepostHeader from '@/components/feed/RepostHeader'
import SwipeableRow from '@/components/ui/SwipeableRow'

interface TakeRepostCardProps {
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

function TakeRepostCard({ clipping, owner, onDeleted }: TakeRepostCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  // Support both new format { take, author } and legacy bare Take stored before the metadata fix
  const json = clipping.review_json as TakeRepostJson | Take | null
  const take: Take = (json && 'take' in json) ? (json as TakeRepostJson).take : (json as Take)
  const author: RepostAuthor = (json && 'author' in json) ? (json as TakeRepostJson).author : { displayName: clipping.author_name }

  const { reposted } = useRepost(take.id)
  const isReposting = useRef(false)

  const handleRepost = useCallback(async () => {
    if (isReposting.current || reposted) return
    isReposting.current = true
    try {
      await saveRepostTake(take, author)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost take:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      isReposting.current = false
    }
  }, [take, author, reposted])

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onDeleted?.(clipping.id)
    deleteClipping(clipping.id).catch((error) => {
      console.error('Failed to delete take repost:', error)
    })
  }, [clipping.id, onDeleted])

  const cardContent = (
    <View style={styles.surface}>
      <RepostHeader owner={owner} />
      <TakeCard take={take} author={author} repostable={false} readOnly />
    </View>
  )

  // Others' take reposts: swipe-to-repost
  if (!onDeleted) {
    return (
      <SwipeableRow
        onAction={handleRepost}
        actionColor={colors.teal}
        actionIcon="repeat-outline"
        actionLabel="Repost this take"
      >
        {cardContent}
      </SwipeableRow>
    )
  }

  // Own take repost: swipe-to-delete
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

export default memo(TakeRepostCard)

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    surface: {
      backgroundColor: colors.background,
    },
  })
}
