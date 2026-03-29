import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, type RouteProp, useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { TakeCommentWithAuthor, Take } from '@/types/database'
import { getTakeById } from '@/services/takes'
import { useTabBarInset } from '@/hooks/useTabBarInset'
import { useLike } from '@/hooks/useLike'
import { useComments } from '@/hooks/useComments'
import { useUser } from '@/hooks/useUser'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import SwipeableRow from '@/components/ui/SwipeableRow'
import Spinner from '@/components/ui/Spinner'

type TakeDetailRoute = RouteProp<FeedStackParamList, 'TakeDetail'>

const MAX_COMMENT_LENGTH = 280
const HORIZONTAL_PAD = 20

export default function TakeDetailScreen() {
  const { params } = useRoute<TakeDetailRoute>()
  const { takeId, author } = params
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const tabBarInset = useTabBarInset()
  const { user } = useUser()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const { liked, count: likeCount, toggle: toggleLike } = useLike(takeId)
  const { comments, isLoading: commentsLoading, addComment, removeComment } = useComments(takeId)

  // We need the Take data. Fetch it by ID since we only pass takeId in params.
  const [take, setTake] = useState<Take | null>(null)
  const [takeLoading, setTakeLoading] = useState(true)

  // Fetch take on mount
  const fetchedRef = useRef(false)
  if (!fetchedRef.current) {
    fetchedRef.current = true
    getTakeById(takeId)
      .then((data) => { if (data) setTake(data) })
      .finally(() => setTakeLoading(false))
  }

  const [commentText, setCommentText] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const remaining = MAX_COMMENT_LENGTH - commentText.length
  const isPostDisabled = isPosting || commentText.trim().length === 0

  const handlePost = useCallback(async () => {
    if (isPostDisabled) return
    setIsPosting(true)
    try {
      await addComment(commentText.trim())
      setCommentText('')
      inputRef.current?.blur()
    } catch (error) {
      console.error('Comment post failed:', error)
      Alert.alert('Error', 'Failed to post comment. Please try again.')
    } finally {
      setIsPosting(false)
    }
  }, [isPostDisabled, commentText, addComment])

  const handleDeleteComment = useCallback((commentId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    removeComment(commentId)
  }, [removeComment])

  const dateStr = take
    ? new Date(take.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  const listHeader = useMemo(() => {
    if (takeLoading || !take) {
      return (
        <View style={styles.loadingContainer}>
          <Spinner size={20} />
        </View>
      )
    }

    return (
      <View style={styles.takeSection}>
        {/* Film title */}
        <Pressable
          onPress={() => navigation.navigate('FilmCard', { tmdbId: take.tmdb_id, movieTitle: take.movie_title })}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.movieTitle} numberOfLines={3}>{take.movie_title}</Text>
        </Pressable>

        {/* Author row */}
        {author ? (
          <Pressable
            onPress={author.userId ? () => navigation.navigate('NativeProfile', { userId: author.userId!, username: author.username }) : undefined}
            disabled={!author.userId}
            style={({ pressed }) => [styles.metaRow, pressed && author.userId && styles.pressed]}
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

        {/* Take body */}
        <Text style={styles.body}>{take.content}</Text>

        {/* Like row */}
        <View style={styles.likeRow}>
          <Pressable
            onPress={toggleLike}
            hitSlop={8}
            style={({ pressed }) => [styles.likeButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? colors.red : colors.secondaryText}
            />
            {likeCount > 0 ? (
              <Text style={[styles.likeCount, liked && { color: colors.red }]}>
                {likeCount}
              </Text>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* Comments label */}
        <Text style={styles.commentsLabel}>
          {commentsLoading ? 'Comments' : `Comments (${comments.length})`}
        </Text>

        {commentsLoading && (
          <View style={styles.commentsLoading}>
            <Spinner size={16} />
          </View>
        )}

        {!commentsLoading && comments.length === 0 && (
          <Text style={styles.emptyText}>No comments yet. Start the conversation.</Text>
        )}
      </View>
    )
  }, [take, takeLoading, author, dateStr, liked, likeCount, toggleLike, comments, commentsLoading, navigation, colors, styles])

  const renderComment = useCallback(({ item }: { item: TakeCommentWithAuthor }) => {
    const isOwn = user?.id === item.comment.user_id
    const commentDate = new Date(item.comment.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

    const row = (
      <View style={styles.commentRow}>
        {item.author.avatarUrl ? (
          <Image source={{ uri: item.author.avatarUrl }} style={styles.commentAvatar} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.commentAvatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {item.author.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Pressable
              onPress={item.author.userId ? () => navigation.navigate('NativeProfile', { userId: item.author.userId!, username: item.author.username }) : undefined}
              disabled={!item.author.userId}
            >
              <Text style={styles.commentAuthor}>{item.author.displayName}</Text>
            </Pressable>
            <Text style={styles.commentDate}>{commentDate}</Text>
          </View>
          <Text style={styles.commentText}>{item.comment.content}</Text>
        </View>
      </View>
    )

    if (!isOwn) return row

    return (
      <SwipeableRow
        onAction={() => handleDeleteComment(item.comment.id)}
        actionColor={colors.red}
        actionIcon="trash-outline"
        actionLabel="Delete comment"
      >
        {row}
      </SwipeableRow>
    )
  }, [user, handleDeleteComment, navigation, colors, styles])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <FlatList
        style={styles.list}
        data={commentsLoading ? [] : comments}
        keyExtractor={(item) => item.comment.id}
        renderItem={renderComment}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Sticky comment input bar */}
      <View style={[styles.inputBar, { paddingBottom: tabBarInset + spacing.sm }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor={colors.secondaryText}
          value={commentText}
          onChangeText={setCommentText}
          maxLength={MAX_COMMENT_LENGTH}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.inputActions}>
          {commentText.length > 0 && (
            <Text style={[styles.charCount, remaining < 20 && styles.charCountWarn]}>
              {remaining}
            </Text>
          )}
          <Pressable
            onPress={handlePost}
            disabled={isPostDisabled}
            hitSlop={8}
          >
            <Ionicons
              name="arrow-up-circle"
              size={28}
              color={isPostDisabled ? colors.border : colors.teal}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingTop: spacing.sm,
    },
    loadingContainer: {
      padding: spacing.xxl,
      alignItems: 'center',
    },
    pressed: {
      opacity: 0.6,
    },

    // Take section (list header)
    takeSection: {
      paddingHorizontal: HORIZONTAL_PAD,
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
    likeRow: {
      flexDirection: 'row',
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    likeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    likeCount: {
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      color: colors.secondaryText,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    commentsLabel: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    commentsLoading: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      fontFamily: fonts.system,
      fontStyle: 'italic' as const,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      paddingVertical: spacing.lg,
    },

    // Comment rows
    commentRow: {
      flexDirection: 'row',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.sm + 2,
    },
    commentAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      marginRight: spacing.sm,
      marginTop: 2,
    },
    commentContent: {
      flex: 1,
    },
    commentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: 2,
    },
    commentAuthor: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.foreground,
    },
    commentDate: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
    },
    commentText: {
      fontFamily: fonts.body,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
    },

    // Sticky input bar
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.foreground,
      maxHeight: 100,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    },
    inputActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingLeft: spacing.sm,
      paddingBottom: Platform.OS === 'ios' ? spacing.sm : 0,
    },
    charCount: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
    },
    charCountWarn: {
      color: colors.yellow,
    },
  })
}
