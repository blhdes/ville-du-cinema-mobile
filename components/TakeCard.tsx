import { memo, useCallback, useMemo, useRef } from 'react'
import { Alert, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import type { Take } from '@/types/database'
import type { FeedStackParamList } from '@/navigation/types'
import { deleteTake } from '@/services/takes'
import { saveRepostTake } from '@/services/clippings'
import { useRepost, publishRepostStatus } from '@/hooks/useRepostCount'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import { formatTakeTimestamp } from '@/utils/timestamp'
import SwipeableRow from '@/components/ui/SwipeableRow'
import FeedDivider from '@/components/ui/FeedDivider'
import TakeInteractionBar from '@/components/TakeInteractionBar'

const HORIZONTAL_PAD = 20

interface TakeCardProps {
  take: Take
  /** Author info — shown in feed/film card contexts where many authors appear. */
  author?: {
    avatarUrl?: string
    displayName: string
    userId?: string
    username?: string
  }
  /** Hide the author row — used on the user's own profile where it's redundant. */
  hideAuthor?: boolean
  /** Called after optimistic delete (swipe gesture). */
  onDeleted?: (id: string) => void
  /** Disables swipe-to-delete — for read-only contexts (other user's profile). */
  readOnly?: boolean
  /** Hides the repost button and disables swipe-to-repost — used when embedded inside TakeRepostCard. */
  repostable?: boolean
  /** Pre-resolved like status from batch fetch (avoids per-card API call in feeds). */
  initialLiked?: boolean
  /** Pre-resolved like count from batch fetch. */
  initialLikeCount?: number
  /** Pre-resolved comment count from batch fetch. */
  initialCommentCount?: number
  /** Pre-resolved repost count from batch fetch. */
  initialRepostCount?: number
  /** Pre-resolved repost status (has current user reposted?) from batch fetch. */
  initialReposted?: boolean
}

function TakeCard({
  take,
  author,
  hideAuthor = false,
  onDeleted,
  readOnly = false,
  repostable = true,
  initialLiked,
  initialLikeCount,
  initialCommentCount,
  initialRepostCount,
  initialReposted,
}: TakeCardProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const { reposted, count: repostCount } = useRepost(take.id, initialReposted, initialRepostCount)
  const isReposting = useRef(false)

  const handleRepost = useCallback(async () => {
    if (isReposting.current) return
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
  }, [take, author, reposted, repostCount])

  const handleDelete = useCallback(() => {
    Alert.alert('Delete take', 'Are you sure you want to delete this take?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          onDeleted?.(take.id)
          deleteTake(take.id).catch((error) => {
            console.error('Failed to delete take:', error)
          })
        },
      },
    ])
  }, [take.id, onDeleted])

  const handleFilmPress = useCallback(() => {
    navigation.navigate('FilmCard', { tmdbId: take.tmdb_id, movieTitle: take.movie_title })
  }, [navigation, take.tmdb_id, take.movie_title])

  const handleAuthorPress = useCallback(() => {
    if (!author?.userId) return
    navigation.navigate('NativeProfile', { userId: author.userId, username: author.username })
  }, [navigation, author])

  const handleDetailPress = useCallback(() => {
    navigation.navigate('TakeDetail', { takeId: take.id, author })
  }, [navigation, take.id, author])

  const dateStr = formatTakeTimestamp(take.created_at, false)

  const cardContent = (
    <Pressable onPress={handleDetailPress}>
    <View style={[styles.article, !repostable && styles.articleEmbedded]}>
      {/* Film title — taps through to Film Card, mirrors ReviewCard header */}
      <Pressable
        onPress={handleFilmPress}
        style={({ pressed }) => pressed && styles.titlePressed}
      >
        <Text style={styles.movieTitle} numberOfLines={3}>
          {take.movie_title}
        </Text>
      </Pressable>

      {/* Meta row: avatar · author · date — taps through to NativeProfile */}
      {!hideAuthor && author ? (
        <Pressable
          onPress={handleAuthorPress}
          disabled={!author.userId}
          style={({ pressed }) => [styles.metaRow, pressed && author.userId && styles.metaPressed]}
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
          <Text style={styles.displayName} numberOfLines={1}>{author.displayName}</Text>
          {dateStr ? <Text style={styles.meta}>{` \u00B7 ${dateStr}`}</Text> : null}
        </Pressable>
      ) : (
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{dateStr}</Text>
        </View>
      )}

      {/* Take body — plain text, no HTML */}
      <Text style={styles.body}>{take.content}</Text>

      <TakeInteractionBar
        take={take}
        author={author}
        repostable={repostable}
        onCommentPress={handleDetailPress}
        onRepostPress={repostable ? handleRepost : undefined}
        initialLiked={initialLiked}
        initialLikeCount={initialLikeCount}
        initialCommentCount={initialCommentCount}
        initialRepostCount={initialRepostCount}
        initialReposted={initialReposted}
      />

      </View>
    <FeedDivider />
    </Pressable>
  )

  // Others' takes: swipe-to-repost (when repostable)
  if (readOnly && repostable) {
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

  // Own takes: swipe-to-delete
  if (!readOnly && onDeleted) {
    return (
      <SwipeableRow
        onAction={handleDelete}
        actionColor={colors.red}
        actionIcon="trash-outline"
        actionLabel="Delete take"
      >
        {cardContent}
      </SwipeableRow>
    )
  }

  return cardContent
}

export default memo(TakeCard)

// ---------------------------------------------------------------------------
// Styles — mirrors ReviewCard's createStyles for visual consistency
// ---------------------------------------------------------------------------

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    article: {
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    articleEmbedded: {
      paddingTop: spacing.sm,
    },
    titlePressed: {
      opacity: 0.6,
    },
    movieTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
      color: colors.foreground,
      marginBottom: spacing.md,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    metaPressed: {
      opacity: 0.6,
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
      flexShrink: 1,
    },
    meta: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
    },

  })
}
