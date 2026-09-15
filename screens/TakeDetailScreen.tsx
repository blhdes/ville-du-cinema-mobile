import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { getBatchCommentLikeStatus } from '@/services/likes'
import { getBatchClippingRepostStatus } from '@/services/clippings'
import { useTabBarInset } from '@/hooks/useTabBarInset'
import { useComments } from '@/hooks/useComments'
import { publishCommentLikeStatus } from '@/hooks/useCommentLike'
import { publishClippingRepostStatus } from '@/hooks/useClippingRepostCount'
import { useUser } from '@/hooks/useUser'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import { formatTakeTimestamp } from '@/utils/timestamp'
import SwipeableRow from '@/components/ui/SwipeableRow'
import FeedDivider from '@/components/ui/FeedDivider'
import Spinner from '@/components/ui/Spinner'
import TakeInteractionBar from '@/components/TakeInteractionBar'
import CommentInteractionBar from '@/components/CommentInteractionBar'

type TakeDetailRoute = RouteProp<FeedStackParamList, 'TakeDetail'>

const MAX_COMMENT_LENGTH = 280
const HORIZONTAL_PAD = 20

export default function TakeDetailScreen() {
  const { params } = useRoute<TakeDetailRoute>()
  const { takeId, author } = params
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const tabBarInset = useTabBarInset()
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  // When keyboard is hidden: padding clears the tab bar.
  // When keyboard is shown: drop to spacing.sm so the input sits flush above the keyboard.
  const inputBarPaddingBottom = keyboardVisible ? spacing.sm : tabBarInset + spacing.sm
  const { user } = useUser()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const { comments, isLoading: commentsLoading, addComment, removeComment } = useComments(takeId)
  const totalCommentCount = useMemo(
    () => comments.reduce((sum, c) => sum + 1 + (c.replies?.length ?? 0), 0),
    [comments],
  )

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
  const [inputKey, setInputKey] = useState(0)
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null)
  const maxInputHeight = 7 * typography.body.lineHeight + (Platform.OS === 'ios' ? spacing.sm * 2 : 0)
  const inputRef = useRef<TextInput>(null)
  const inputScrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true))
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false))
    return () => { show.remove(); hide.remove() }
  }, [])

  // Batch-fetch like + repost status for comments as they load, and publish
  // into the pub/sub caches so each CommentInteractionBar picks them up.
  // Tracks already-fetched ids so new comments don't refetch the whole thread.
  const fetchedStatusIds = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newIds = comments
      .flatMap((c) => [c.comment.id, ...(c.replies?.map((r) => r.comment.id) ?? [])])
      .filter((id) => !id.startsWith('optimistic-') && !fetchedStatusIds.current.has(id))
    if (newIds.length === 0) return
    for (const id of newIds) fetchedStatusIds.current.add(id)

    getBatchCommentLikeStatus(newIds)
      .then((statusMap) => statusMap.forEach((status, id) => publishCommentLikeStatus(id, status)))
      .catch((error) => console.error('Failed to fetch comment like status:', error))
    getBatchClippingRepostStatus(newIds.map((id) => `comment:${id}`))
      .then((statusMap) => statusMap.forEach((status, url) => publishClippingRepostStatus(url, status)))
      .catch((error) => console.error('Failed to fetch comment repost status:', error))
  }, [comments])

  const remaining = MAX_COMMENT_LENGTH - commentText.length
  const isPostDisabled = isPosting || commentText.trim().length === 0

  const handlePost = useCallback(async () => {
    if (isPostDisabled) return
    setIsPosting(true)
    try {
      await addComment(commentText.trim(), replyingTo?.commentId)
      setCommentText('')
      setInputKey((k) => k + 1)
      setReplyingTo(null)
      inputRef.current?.blur()
    } catch (error) {
      console.error('Comment post failed:', error)
      Alert.alert('Error', 'Failed to post comment. Please try again.')
    } finally {
      setIsPosting(false)
    }
  }, [isPostDisabled, commentText, addComment, replyingTo])

  const handleReplyPress = useCallback((commentId: string, authorName: string) => {
    setReplyingTo({ commentId, authorName })
    inputRef.current?.focus()
  }, [])

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert('Delete comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeComment(commentId) },
    ])
  }, [removeComment])

  const dateStr = take ? formatTakeTimestamp(take.created_at, true) : ''

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

        <TakeInteractionBar
          take={take}
          author={author}
          size="md"
          onCommentPress={() => inputRef.current?.focus()}
        />
      </View>
    )
  }, [take, takeLoading, author, dateStr, navigation, styles, inputRef])

  const renderCommentRow = useCallback((item: TakeCommentWithAuthor, isReply: boolean) => {
    const isOwn = user?.id === item.comment.user_id
    const commentDate = formatTakeTimestamp(item.comment.created_at, false)

    const row = (
      <View style={[styles.commentRow, isReply && styles.replyRow]}>
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
          {take && !item.comment.id.startsWith('optimistic-') && (
            <CommentInteractionBar
              comment={item.comment}
              author={item.author}
              take={take}
              takeAuthor={author}
              onReplyPress={isReply ? undefined : () => handleReplyPress(item.comment.id, item.author.displayName)}
            />
          )}
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
  }, [user, take, author, handleDeleteComment, handleReplyPress, navigation, colors, styles])

  const renderComment = useCallback(({ item }: { item: TakeCommentWithAuthor }) => (
    <View>
      {renderCommentRow(item, false)}
      {item.replies?.map((reply) => (
        <View key={reply.comment.id}>{renderCommentRow(reply, true)}</View>
      ))}
    </View>
  ), [renderCommentRow])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <FlatList
        style={styles.list}
        data={comments}
        keyExtractor={(item) => item.comment.id}
        renderItem={renderComment}
        ListHeaderComponent={
          <View>
            {listHeader}
            <FeedDivider />
            <Text style={styles.commentsLabel}>
              {commentsLoading ? 'Comments' : `Comments (${totalCommentCount})`}
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
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Sticky comment input bar */}
      <View style={[styles.inputBar, { paddingBottom: inputBarPaddingBottom }]}>
        {replyingTo && (
          <View style={styles.replyingBanner}>
            <Text style={styles.replyingText} numberOfLines={1}>
              Replying to {replyingTo.authorName}
            </Text>
            <Pressable onPress={handleCancelReply} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.secondaryText} />
            </Pressable>
          </View>
        )}
        <View style={styles.inputRow}>
        <ScrollView
          ref={inputScrollRef}
          style={[styles.inputScroll, { maxHeight: maxInputHeight }]}
          onContentSizeChange={() => inputScrollRef.current?.scrollToEnd({ animated: false })}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            key={inputKey}
            ref={inputRef}
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={colors.secondaryText}
            value={commentText}
            onChangeText={setCommentText}
            maxLength={MAX_COMMENT_LENGTH}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>
        <View style={styles.inputActions}>
          <Text style={[
            styles.charCount,
            remaining < 20 && styles.charCountWarn,
            commentText.length === 0 && styles.charCountHidden,
          ]}>
            {remaining}
          </Text>
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
    commentsLabel: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      paddingHorizontal: HORIZONTAL_PAD,
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
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.lg,
    },

    // Comment rows
    commentRow: {
      flexDirection: 'row',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.sm + 2,
    },
    replyRow: {
      paddingLeft: HORIZONTAL_PAD + 34,
      paddingVertical: spacing.sm,
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
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    replyingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.sm,
    },
    replyingText: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
      flex: 1,
    },
    inputScroll: {
      flexGrow: 1,
      flexShrink: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
    },
    input: {
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.foreground,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
      paddingHorizontal: spacing.sm,
      minHeight: 36,
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
      width: 28,
      textAlign: 'right',
    },
    charCountWarn: {
      color: colors.yellow,
    },
    charCountHidden: {
      opacity: 0,
    },
  })
}
