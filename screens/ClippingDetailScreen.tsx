import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
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
import type { ClippingCommentWithAuthor } from '@/types/database'
import { useTabBarInset } from '@/hooks/useTabBarInset'
import { useClippingComments } from '@/hooks/useClippingComments'
import { useUser } from '@/hooks/useUser'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import { formatTakeTimestamp } from '@/utils/timestamp'
import SwipeableRow from '@/components/ui/SwipeableRow'
import FeedDivider from '@/components/ui/FeedDivider'
import ClippingInteractionBar from '@/components/ClippingInteractionBar'

type ClippingDetailRoute = RouteProp<FeedStackParamList, 'ClippingDetail'>

const MAX_COMMENT_LENGTH = 280
const HORIZONTAL_PAD = 20

export default function ClippingDetailScreen() {
  const { params } = useRoute<ClippingDetailRoute>()
  const { clipping, owner } = params
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const tabBarInset = useTabBarInset()
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const inputBarPaddingBottom = keyboardVisible ? spacing.sm : tabBarInset + spacing.sm
  const { user } = useUser()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const { comments, isLoading: commentsLoading, addComment, removeComment } = useClippingComments(clipping.original_url)

  const [commentText, setCommentText] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [inputKey, setInputKey] = useState(0)
  const maxInputHeight = 7 * typography.body.lineHeight + (Platform.OS === 'ios' ? spacing.sm * 2 : 0)
  const inputRef = useRef<TextInput>(null)
  const inputScrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true))
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false))
    return () => { show.remove(); hide.remove() }
  }, [])

  const remaining = MAX_COMMENT_LENGTH - commentText.length
  const isPostDisabled = isPosting || commentText.trim().length === 0

  const handlePost = useCallback(async () => {
    if (isPostDisabled) return
    setIsPosting(true)
    try {
      await addComment(commentText.trim())
      setCommentText('')
      setInputKey((k) => k + 1)
      inputRef.current?.blur()
    } catch (error) {
      console.error('Comment post failed:', error)
      Alert.alert('Error', 'Failed to post comment. Please try again.')
    } finally {
      setIsPosting(false)
    }
  }, [isPostDisabled, commentText, addComment])

  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert('Delete comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeComment(commentId) },
    ])
  }, [removeComment])

  const dateStr = formatTakeTimestamp(clipping.created_at, true)

  const listHeader = useMemo(() => (
    <View style={styles.clippingSection}>
      <Pressable
        onPress={() => clipping.tmdb_id && navigation.navigate('FilmCard', { tmdbId: clipping.tmdb_id, movieTitle: clipping.movie_title })}
        disabled={!clipping.tmdb_id}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.movieTitle} numberOfLines={3}>{clipping.movie_title}</Text>
      </Pressable>

      {owner ? (
        <Pressable
          onPress={owner.userId ? () => navigation.navigate('NativeProfile', { userId: owner.userId!, username: owner.username }) : undefined}
          disabled={!owner.userId}
          style={({ pressed }) => [styles.metaRow, pressed && owner.userId && styles.pressed]}
        >
          {owner.avatarUrl ? (
            <Image source={{ uri: owner.avatarUrl }} style={styles.avatar} cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{owner.displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.meta}>
            {owner.displayName}
            {dateStr ? ` · ${dateStr}` : ''}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{dateStr}</Text>
        </View>
      )}

      <Text style={styles.body}>{clipping.quote_text}</Text>
      <Text style={styles.attributionMeta}>{clipping.author_name}</Text>

      <ClippingInteractionBar
        clipping={clipping}
        owner={owner}
        size="md"
        onCommentPress={() => inputRef.current?.focus()}
      />
    </View>
  ), [clipping, owner, dateStr, navigation, styles])

  const renderComment = useCallback(({ item }: { item: ClippingCommentWithAuthor }) => {
    const isOwn = user?.id === item.comment.user_id
    const commentDate = formatTakeTimestamp(item.comment.created_at, false)

    const row = (
      <View style={styles.commentRow}>
        {item.author.avatarUrl ? (
          <Image source={{ uri: item.author.avatarUrl }} style={styles.commentAvatar} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.commentAvatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{item.author.displayName.charAt(0).toUpperCase()}</Text>
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
        data={comments}
        keyExtractor={(item) => item.comment.id}
        renderItem={renderComment}
        ListHeaderComponent={
          <View>
            {listHeader}
            <FeedDivider />
            <Text style={styles.commentsLabel}>
              {commentsLoading ? 'Comments' : `Comments (${comments.length})`}
            </Text>
            {!commentsLoading && comments.length === 0 && (
              <Text style={styles.emptyText}>No comments yet. Start the conversation.</Text>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.inputBar, { paddingBottom: inputBarPaddingBottom }]}>
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
          <Pressable onPress={handlePost} disabled={isPostDisabled} hitSlop={8}>
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

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { flex: 1 },
    listContent: { paddingTop: spacing.sm },
    pressed: { opacity: 0.6 },

    clippingSection: { paddingHorizontal: HORIZONTAL_PAD },
    movieTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
      color: colors.foreground,
      marginBottom: spacing.md,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    avatar: { width: 26, height: 26, borderRadius: 13, marginRight: 8 },
    avatarFallback: { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { fontFamily: fonts.system, fontSize: 10, color: colors.secondaryText },
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
    attributionMeta: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      marginTop: spacing.xs,
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
    emptyText: {
      fontFamily: fonts.system,
      fontStyle: 'italic' as const,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.lg,
    },

    commentRow: {
      flexDirection: 'row',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.sm + 2,
    },
    commentAvatar: { width: 26, height: 26, borderRadius: 13, marginRight: spacing.sm, marginTop: 2 },
    commentContent: { flex: 1 },
    commentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
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

    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
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
    charCountWarn: { color: colors.yellow },
    charCountHidden: { opacity: 0 },
  })
}
