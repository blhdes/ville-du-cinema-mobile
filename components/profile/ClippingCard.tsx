import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Animated, InteractionManager, LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Swipeable } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { Clipping } from '@/types/database'
import { deleteClipping } from '@/services/clippings'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, getScaledTypography, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'

interface ClippingCardProps {
  clipping: Clipping
  onDeleted: (id: string) => void
  /** Optional social header — avatar URL + display name shown above the quote */
  user?: { avatarUrl?: string; displayName: string }
  /** Disables swipe-to-delete. Use on read-only views (e.g. another user's profile). */
  readOnly?: boolean
}

function ClippingCard({ clipping, onDeleted, user, readOnly = false }: ClippingCardProps) {
  const { colors } = useTheme()
  const typography = useTypography()
  const { preferences } = useDisplayPreferences()
  const scaled = useMemo(() => getScaledTypography(preferences.fontMultiplier), [preferences.fontMultiplier])
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const [isExpanded, setIsExpanded] = useState(false)
  const swipeableRef = useRef<Swipeable>(null)

  const handleExpand = useCallback(() => {
    if (isExpanded) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded(true)
  }, [isExpanded])

  const handleDelete = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await deleteClipping(clipping.id)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      InteractionManager.runAfterInteractions(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        onDeleted(clipping.id)
      })
    } catch (error) {
      console.error('Failed to delete clipping:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      swipeableRef.current?.close()
    }
  }, [clipping.id, onDeleted])

  const renderRightActions = useCallback(
    (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const opacity = dragX.interpolate({
        inputRange: [-100, -40],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })

      return (
        <Pressable onPress={handleDelete} style={styles.deleteAction}>
          <Animated.View style={{ opacity }}>
            <Ionicons name="trash-outline" size={22} color={colors.red} />
          </Animated.View>
        </Pressable>
      )
    },
    [handleDelete, styles.deleteAction, colors.red],
  )

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
              <View style={styles.identity}>
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
              </View>
            )}
            <Text style={styles.openQuoteMark}>{'\u201C'}</Text>
          </View>

          {/* ── Quote text ── */}
          <Text
            style={[styles.quote, { fontSize: scaled.body.fontSize, lineHeight: scaled.body.lineHeight }]}
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

        {/* ── Hairline divider ── */}
        <View style={styles.divider} />
      </View>
  )

  if (readOnly) return cardContent

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={60}
      overshootRight={false}
      friction={2}
      overshootFriction={8}
    >
      {cardContent}
    </Swipeable>
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
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.secondaryText,
    },
    displayName: {
      fontFamily: fonts.bodyBold,
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
      fontSize: typography.title3.fontSize,
      lineHeight: typography.title3.lineHeight,
      color: colors.foreground,
    },

    // ── Attribution ──
    attribution: {
      marginTop: spacing.md,
      gap: 2,
    },
    movieTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.foreground,
    },
    authorMeta: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },

    // ── Divider ──
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: 20,
    },

    // ── Swipe delete ──
    deleteAction: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 100,
    },
  })
}
