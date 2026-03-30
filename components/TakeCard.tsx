import { memo, useCallback, useMemo } from 'react'
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { Take } from '@/types/database'
import type { FeedStackParamList } from '@/navigation/types'
import { deleteTake } from '@/services/takes'
import { useLike } from '@/hooks/useLike'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import SwipeableRow from '@/components/ui/SwipeableRow'
import FeedDivider from '@/components/ui/FeedDivider'

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
  /** Pre-resolved like status from batch fetch (avoids per-card API call in feeds). */
  initialLiked?: boolean
  /** Pre-resolved like count from batch fetch. */
  initialLikeCount?: number
  /** Pre-resolved comment count from batch fetch. */
  commentCount?: number
}

function TakeCard({
  take,
  author,
  hideAuthor = false,
  onDeleted,
  readOnly = false,
  initialLiked,
  initialLikeCount,
  commentCount,
}: TakeCardProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const { liked, count: likeCount, toggle: toggleLike } = useLike(
    take.id,
    initialLiked,
    initialLikeCount,
  )

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onDeleted?.(take.id)
    deleteTake(take.id).catch((error) => {
      console.error('Failed to delete take:', error)
    })
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

  const dateStr = new Date(take.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const cardContent = (
    <Pressable onPress={handleDetailPress}>
    <View style={styles.article}>
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
          <Text style={styles.meta}>
            {author.displayName}
            {dateStr ? ` \u00B7 ${dateStr}` : ''}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{dateStr}</Text>
        </View>
      )}

      {/* Take body — plain text, no HTML */}
      <Text style={styles.body}>{take.content}</Text>

      {/* Interaction bar: like + comment */}
      <View style={styles.interactionBar}>
        <Pressable
          onPress={toggleLike}
          hitSlop={8}
          style={({ pressed }) => [styles.interactionButton, pressed && styles.interactionPressed]}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={16}
            color={liked ? colors.red : colors.secondaryText}
          />
          {likeCount > 0 ? (
            <Text style={[styles.interactionCount, liked && { color: colors.red }]}>
              {likeCount}
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          onPress={handleDetailPress}
          hitSlop={8}
          style={({ pressed }) => [styles.interactionButton, pressed && styles.interactionPressed]}
        >
          <Ionicons name="chatbubble-outline" size={15} color={colors.secondaryText} />
          {(commentCount ?? 0) > 0 ? (
            <Text style={styles.interactionCount}>{commentCount}</Text>
          ) : null}
        </Pressable>
      </View>

      </View>
    <FeedDivider />
    </Pressable>
  )

  if (readOnly || !onDeleted) return cardContent

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
    meta: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      flex: 1,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
    },

    // Interaction bar
    interactionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    interactionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    interactionPressed: {
      opacity: 0.5,
    },
    interactionCount: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
    },

  })
}
