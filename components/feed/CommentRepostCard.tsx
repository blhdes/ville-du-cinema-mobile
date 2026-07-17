import { memo, useCallback, useMemo, useRef } from 'react'
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { Clipping, CommentRepostJson } from '@/types/database'
import type { FeedStackParamList } from '@/navigation/types'
import { deleteClipping, saveRepostComment } from '@/services/clippings'
import { useClippingRepost, publishClippingRepostStatus } from '@/hooks/useClippingRepostCount'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import RepostHeader from '@/components/feed/RepostHeader'
import SwipeableRow from '@/components/ui/SwipeableRow'
import FeedDivider from '@/components/ui/FeedDivider'

interface CommentRepostCardProps {
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

function CommentRepostCard({ clipping, owner, onDeleted, initialRepostCount, initialReposted }: CommentRepostCardProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const json = clipping.review_json as CommentRepostJson | null
  const comment = json?.comment
  const author = json?.author ?? { displayName: clipping.author_name }
  const take = json?.take

  const { reposted, count: repostCount } = useClippingRepost(clipping.original_url, initialReposted, initialRepostCount)
  const isReposting = useRef(false)

  const handleRepost = useCallback(async () => {
    if (!comment || !take || isReposting.current || reposted) return
    isReposting.current = true
    const prevReposted = reposted
    const prevCount = repostCount
    publishClippingRepostStatus(clipping.original_url, { reposted: true, count: prevCount + 1 })
    try {
      await saveRepostComment(comment, author, take, json?.takeAuthor)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost comment:', error)
      publishClippingRepostStatus(clipping.original_url, { reposted: prevReposted, count: prevCount })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      isReposting.current = false
    }
  }, [comment, take, author, json?.takeAuthor, clipping.original_url, reposted, repostCount])

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onDeleted?.(clipping.id)
    deleteClipping(clipping.id).catch((error) => {
      console.error('Failed to delete comment repost:', error)
    })
  }, [clipping.id, onDeleted])

  const handleOpenThread = useCallback(() => {
    if (!take) return
    navigation.navigate('TakeDetail', { takeId: take.id, author: json?.takeAuthor })
  }, [navigation, take, json?.takeAuthor])

  const handleOpenAuthor = useCallback(() => {
    if (!author.userId) return
    navigation.navigate('NativeProfile', { userId: author.userId, username: author.username })
  }, [navigation, author.userId, author.username])

  const cardContent = (
    <View style={styles.surface}>
      <RepostHeader owner={owner} />
      <Pressable
        onPress={handleOpenThread}
        disabled={!take}
        style={({ pressed }) => [styles.container, pressed && !!take && styles.pressed]}
      >
        {/* ── Comment author row ── */}
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.identity, pressed && !!author.userId && styles.pressed]}
            onPress={handleOpenAuthor}
            disabled={!author.userId}
          >
            {author.avatarUrl ? (
              <Image source={{ uri: author.avatarUrl }} style={styles.avatar} cachePolicy="memory-disk" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {author.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.displayName} numberOfLines={1}>
              {author.displayName}
            </Text>
          </Pressable>
          <Ionicons name="chatbubble-outline" size={16} color={colors.secondaryText} />
        </View>

        {/* ── Comment text ── */}
        <Text style={styles.commentText}>{clipping.quote_text}</Text>

        {/* ── Film context + repost count ── */}
        <View style={styles.attributionRow}>
          <View style={styles.attribution}>
            <Text style={styles.movieTitle} numberOfLines={1}>
              {clipping.movie_title}
            </Text>
            <Text style={styles.contextMeta}>Comment on a Take</Text>
          </View>
          {repostCount > 0 && (
            <View style={styles.repostBadge}>
              <Ionicons name="repeat-outline" size={13} color={reposted ? colors.teal : colors.secondaryText} />
              <Text style={[styles.repostCount, reposted && { color: colors.teal }]}>{repostCount}</Text>
            </View>
          )}
        </View>
      </Pressable>
      <FeedDivider />
    </View>
  )

  // Others' comment reposts: swipe-to-repost
  if (!onDeleted) {
    return (
      <SwipeableRow
        onAction={handleRepost}
        actionColor={colors.teal}
        actionIcon="repeat-outline"
        actionLabel="Repost this comment"
      >
        {cardContent}
      </SwipeableRow>
    )
  }

  // Own comment repost: swipe-to-delete
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

export default memo(CommentRepostCard)

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    surface: {
      backgroundColor: colors.background,
    },
    container: {
      paddingHorizontal: 20,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    pressed: {
      opacity: 0.6,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: spacing.sm,
    },
    avatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      marginRight: 8,
    },
    avatarFallback: {
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      fontFamily: fonts.system,
      fontSize: 10,
      color: colors.secondaryText,
    },
    displayName: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
    },
    commentText: {
      fontFamily: fonts.body,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
    },
    attributionRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    attribution: {
      flex: 1,
      gap: 2,
    },
    movieTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.title3.fontSize,
      lineHeight: typography.title3.lineHeight,
      color: colors.foreground,
    },
    contextMeta: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    repostBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 3,
      paddingBottom: 2,
    },
    repostCount: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
    },
  })
}
