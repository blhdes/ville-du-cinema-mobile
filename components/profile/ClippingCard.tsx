import { memo, useCallback, useMemo, useState } from 'react'
import { LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { Clipping } from '@/types/database'
import type { FeedStackParamList } from '@/navigation/types'
import { deleteClipping } from '@/services/clippings'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import SwipeableRow from '@/components/ui/SwipeableRow'
import FeedDivider from '@/components/ui/FeedDivider'

interface ClippingCardProps {
  clipping: Clipping
  onDeleted?: (id: string) => void
  /** Optional social header — avatar URL + display name shown above the quote */
  user?: { avatarUrl?: string; displayName: string; userId?: string; username?: string }
  /** Disables swipe-to-delete. Use on read-only views (e.g. another user's profile). */
  readOnly?: boolean
}

function ClippingCard({ clipping, onDeleted, user, readOnly = false }: ClippingCardProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const [isExpanded, setIsExpanded] = useState(false)

  const handleExpand = useCallback(() => {
    if (isExpanded) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded(true)
  }, [isExpanded])

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onDeleted?.(clipping.id)
    deleteClipping(clipping.id).catch((error) => {
      console.error('Failed to delete clipping:', error)
    })
  }, [clipping.id, onDeleted])

  const cardContent = (
      <View style={styles.surface}>
        <Pressable
          onPress={handleExpand}
          disabled={isExpanded}
          style={({ pressed }) => [styles.container, pressed && styles.pressed]}
        >
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
        </Pressable>

        <FeedDivider />
      </View>
  )

  if (readOnly) return cardContent

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
    pressed: {
      opacity: 0.6,
    },

    // ── Header row (avatar + name | quote mark) ──
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
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
      marginLeft: spacing.sm,
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
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
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
