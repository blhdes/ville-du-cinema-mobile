import { memo, useCallback, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { Take } from '@/types/database'
import { saveRepostTake } from '@/services/clippings'
import { useLike } from '@/hooks/useLike'
import { useCommentCount } from '@/hooks/useCommentCount'
import { useRepost, publishRepostStatus } from '@/hooks/useRepostCount'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'

interface TakeInteractionBarProps {
  take: Take
  author?: { avatarUrl?: string; displayName: string; userId?: string; username?: string }
  /** false = show count only, no action (embedded inside a repost card). Default: true. */
  repostable?: boolean
  /** Called when the comment icon is pressed. */
  onCommentPress?: () => void
  /**
   * When provided, overrides the bar's internal repost handler.
   * Use this when a parent (e.g. TakeCard) owns the swipe-to-repost action and
   * needs the same isReposting guard to cover both swipe and button.
   */
  onRepostPress?: () => void
  initialLiked?: boolean
  initialLikeCount?: number
  initialCommentCount?: number
  initialRepostCount?: number
  initialReposted?: boolean
  /** 'sm' for feed cards (16px icons), 'md' for detail screen (20px icons). Default: 'sm'. */
  size?: 'sm' | 'md'
}

function TakeInteractionBar({
  take,
  author,
  repostable = true,
  onCommentPress,
  onRepostPress,
  initialLiked,
  initialLikeCount,
  initialCommentCount,
  initialRepostCount,
  initialReposted,
  size = 'sm',
}: TakeInteractionBarProps) {
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography, size), [colors, typography, size])

  const { liked, count: likeCount, toggle: toggleLike } = useLike(take.id, initialLiked, initialLikeCount)
  const commentCount = useCommentCount(take.id, initialCommentCount)
  const { reposted, count: repostCount } = useRepost(take.id, initialReposted, initialRepostCount)
  const isReposting = useRef(false)

  const isMd = size === 'md'
  const heartSize = isMd ? 20 : 16
  const chatSize = isMd ? 20 : 15
  const repeatSize = isMd ? 20 : 17

  const handleRepost = useCallback(async () => {
    if (!repostable || isReposting.current) return
    isReposting.current = true
    const prevReposted = reposted
    const prevCount = repostCount
    publishRepostStatus(take.id, { reposted: true, count: prevCount + 1 })
    try {
      await saveRepostTake(take, {
        displayName: author?.displayName ?? 'Unknown',
        userId: author?.userId,
        avatarUrl: author?.avatarUrl,
        username: author?.username,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost take:', error)
      publishRepostStatus(take.id, { reposted: prevReposted, count: prevCount })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      isReposting.current = false
    }
  }, [take, author, repostable, reposted, repostCount])

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
          size={heartSize}
          color={liked ? colors.red : colors.secondaryText}
        />
        <Text style={[styles.count, liked && { color: colors.red }]}>
          {likeCount > 0 ? likeCount : ''}
        </Text>
      </Pressable>

      {/* Comment */}
      <Pressable
        onPress={onCommentPress}
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="chatbubble-outline" size={chatSize} color={colors.secondaryText} />
        <Text style={styles.count}>
          {(commentCount ?? 0) > 0 ? commentCount : ''}
        </Text>
      </Pressable>

      {/* Repost */}
      {repostable ? (
        <Pressable
          onPress={onRepostPress ?? handleRepost}
          hitSlop={8}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Ionicons
            name="repeat-outline"
            size={repeatSize}
            color={reposted ? colors.teal : colors.secondaryText}
          />
          <Text style={[styles.count, reposted && { color: colors.teal }]}>
            {repostCount > 0 ? repostCount : ''}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.button}>
          <Ionicons
            name="repeat-outline"
            size={repeatSize}
            color={reposted ? colors.teal : colors.secondaryText}
          />
          <Text style={[styles.count, reposted && { color: colors.teal }]}>
            {repostCount > 0 ? repostCount : ''}
          </Text>
        </View>
      )}
    </View>
  )
}

export default memo(TakeInteractionBar)

function createStyles(colors: ThemeColors, typography: ScaledTypography, size: 'sm' | 'md') {
  const isMd = size === 'md'
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      marginTop: spacing.md,
      marginBottom: isMd ? spacing.md : 0,
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
      fontSize: isMd ? typography.callout.fontSize : typography.caption.fontSize,
      lineHeight: isMd ? typography.callout.lineHeight : typography.caption.lineHeight,
      color: colors.secondaryText,
      minWidth: isMd ? typography.callout.fontSize * 2 : typography.caption.fontSize * 2,
    },
  })
}
