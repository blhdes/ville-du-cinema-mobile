import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Alert, LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { Clipping } from '@/types/database'
import type { FeedStackParamList } from '@/navigation/types'
import { deleteClipping, saveRepostClipping } from '@/services/clippings'
import { useClippingRepost, publishClippingRepostStatus } from '@/hooks/useClippingRepostCount'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import SwipeableRow from '@/components/ui/SwipeableRow'
import FeedDivider from '@/components/ui/FeedDivider'
import RepostHeader from '@/components/feed/RepostHeader'

interface ClippingCardProps {
  clipping: Clipping
  onDeleted?: (id: string) => void
  /** Optional social header — avatar URL + display name shown above the quote */
  user?: { avatarUrl?: string; displayName: string; userId?: string; username?: string }
  /** Disables swipe-to-delete. Use on read-only views (e.g. another user's profile). */
  readOnly?: boolean
  /** Hides swipe-to-repost — used when embedded inside ClippingRepostCard. */
  repostable?: boolean
  initialRepostCount?: number
  initialReposted?: boolean
  /** When provided, a RepostHeader appears above the card once the user reposts it. */
  reposter?: { displayName: string; userId?: string; username?: string }
}

function ClippingCard({ clipping, onDeleted, user, readOnly = false, repostable = true, initialRepostCount, initialReposted, reposter }: ClippingCardProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const [isExpanded, setIsExpanded] = useState(false)
  const { reposted, count: repostCount } = useClippingRepost(clipping.original_url, initialReposted, initialRepostCount)
  const isReposting = useRef(false)

  const handleExpand = useCallback(() => {
    if (isExpanded) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded(true)
  }, [isExpanded])

  const handleRepost = useCallback(async () => {
    if (isReposting.current || reposted) return
    isReposting.current = true
    const prevReposted = reposted
    const prevCount = repostCount
    publishClippingRepostStatus(clipping.original_url, { reposted: true, count: reposted ? prevCount : prevCount + 1 })
    try {
      await saveRepostClipping(clipping, {
        displayName: user?.displayName ?? clipping.author_name,
        userId: user?.userId,
        avatarUrl: user?.avatarUrl,
        username: user?.username,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost clipping:', error)
      publishClippingRepostStatus(clipping.original_url, { reposted: prevReposted, count: prevCount })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      isReposting.current = false
    }
  }, [clipping, user, reposted, repostCount])

  const handleDelete = useCallback(() => {
    Alert.alert('Delete clipping', 'Are you sure you want to delete this clipping?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          onDeleted?.(clipping.id)
          deleteClipping(clipping.id).catch((error) => {
            console.error('Failed to delete clipping:', error)
          })
        },
      },
    ])
  }, [clipping.id, onDeleted])

  const cardContent = (
      <View style={styles.surface}>
        {repostable && reposted && reposter && (
          <RepostHeader owner={reposter} repostCount={repostCount} reposted={reposted} />
        )}
        <Pressable
          onPress={handleExpand}
          disabled={isExpanded}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <View style={[styles.container, !repostable && styles.containerEmbedded]}>
          {/* ── Header row: avatar + name on left, decorative " on right ── */}
          <View style={styles.headerRow}>
            {user && (
              <Pressable
                style={({ pressed }) => [styles.identity, pressed && user.userId && styles.pressed]}
                onPress={user.userId ? () => navigation.navigate('NativeProfile', { userId: user.userId!, username: user.username }) : undefined}
                disabled={!user.userId}
              >
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatar} cachePolicy="memory-disk" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {user.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.displayName} numberOfLines={1}>
                  {user.displayName}
                </Text>
              </Pressable>
            )}
            <Text style={styles.openQuoteMark}>{'\u201C'}</Text>
          </View>

          {/* ── Quote text ── */}
          <Text
            style={styles.quote}
            numberOfLines={isExpanded ? undefined : 6}
          >
            {clipping.quote_text}
          </Text>

          {/* ── Source attribution ── */}
          <Pressable
            onPress={() => Linking.openURL(clipping.original_url)}
            hitSlop={8}
            style={({ pressed }) => [styles.attribution, pressed && styles.pressed]}
          >
            <Text style={styles.movieTitle} numberOfLines={1}>
              {clipping.movie_title}
            </Text>
            <Text style={styles.authorMeta}>
              {clipping.author_name}
            </Text>
          </Pressable>

          </View>
          <FeedDivider />
        </Pressable>
      </View>
  )

  // Others' clippings: swipe-to-repost (when repostable)
  if (readOnly && repostable) {
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

  // Embedded in ClippingRepostCard: no swipe
  if (readOnly) return cardContent

  // Own clippings: swipe-to-delete
  return (
    <SwipeableRow
      onAction={handleDelete}
      actionColor={colors.red}
      actionIcon="trash-outline"
      actionLabel="Delete clipping"
    >
      {cardContent}
    </SwipeableRow>
  )
}

export default memo(ClippingCard)

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    surface: {
      backgroundColor: colors.background,
    },
    container: {
      paddingHorizontal: 20,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    containerEmbedded: {
      paddingTop: spacing.sm,
    },
    pressed: {
      opacity: 0.6,
    },

    // ── Header row (avatar + name | quote mark) ──
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
    openQuoteMark: {
      fontFamily: fonts.heading,
      fontSize: 44,
      lineHeight: 44,
      color: colors.border,
    },
    quote: {
      fontFamily: fonts.body,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
    },

    // ── Attribution ──
    attribution: {
      marginTop: spacing.md,
      gap: 2,
    },
    movieTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.title3.fontSize,
      lineHeight: typography.title3.lineHeight,
      color: colors.foreground,
    },
    authorMeta: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
  })
}
