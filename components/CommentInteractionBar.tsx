import { memo, useCallback, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { Take, TakeComment, RepostAuthor } from '@/types/database'
import { saveRepostComment } from '@/services/clippings'
import { useCommentLike } from '@/hooks/useCommentLike'
import { useClippingRepost, publishClippingRepostStatus } from '@/hooks/useClippingRepostCount'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import { formatCompactCount } from '@/utils/formatCount'

interface CommentInteractionBarProps {
  comment: TakeComment
  /** Author of the comment — snapshotted into the repost payload. */
  author: RepostAuthor
  /** Parent Take — gives the repost its film context. */
  take: Take
  /** Author of the parent Take — preserved so the repost card can navigate to the full thread. */
  takeAuthor?: RepostAuthor
  /** Shown only on top-level comments — replies can't themselves be replied to. */
  onReplyPress?: () => void
}

function CommentInteractionBar({ comment, author, take, takeAuthor, onReplyPress }: CommentInteractionBarProps) {
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const { liked, count: likeCount, toggle: toggleLike } = useCommentLike(comment.id)
  const repostUrl = `comment:${comment.id}`
  const { reposted, count: repostCount } = useClippingRepost(repostUrl)
  const isReposting = useRef(false)

  const handleRepost = useCallback(async () => {
    if (isReposting.current || reposted) return
    isReposting.current = true
    const prevReposted = reposted
    const prevCount = repostCount
    publishClippingRepostStatus(repostUrl, { reposted: true, count: prevCount + 1 })
    try {
      await saveRepostComment(comment, author, take, takeAuthor)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost comment:', error)
      publishClippingRepostStatus(repostUrl, { reposted: prevReposted, count: prevCount })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      isReposting.current = false
    }
  }, [comment, author, take, takeAuthor, repostUrl, reposted, repostCount])

  return (
    <View style={styles.bar}>
      {/* Like */}
      <Pressable
        onPress={toggleLike}
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={14}
          color={liked ? colors.red : colors.secondaryText}
        />
        <Text style={[styles.count, liked && { color: colors.red }]}>
          {likeCount > 0 ? formatCompactCount(likeCount) : ''}
        </Text>
      </Pressable>

      {/* Repost */}
      <Pressable
        onPress={handleRepost}
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons
          name="repeat-outline"
          size={15}
          color={reposted ? colors.teal : colors.secondaryText}
        />
        <Text style={[styles.count, reposted && { color: colors.teal }]}>
          {repostCount > 0 ? formatCompactCount(repostCount) : ''}
        </Text>
      </Pressable>

      {/* Reply — top-level comments only */}
      {onReplyPress && (
        <Pressable
          onPress={onReplyPress}
          hitSlop={8}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-undo-outline" size={14} color={colors.secondaryText} />
        </Pressable>
      )}
    </View>
  )
}

export default memo(CommentInteractionBar)

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    pressed: {
      opacity: 0.5,
    },
    count: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
      minWidth: typography.caption.fontSize * 2,
    },
  })
}
