import { useCallback, useMemo, useRef, useState } from 'react'
import { Animated, Image, InteractionManager, LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { Clipping } from '@/types/database'
import { deleteClipping } from '@/services/clippings'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'

interface ClippingCardProps {
  clipping: Clipping
  onDeleted: (id: string) => void
  /** Optional social header — avatar URL + display name shown above the quote */
  user?: { avatarUrl?: string; displayName: string }
}

export default function ClippingCard({ clipping, onDeleted, user }: ClippingCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
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
      // Let the swipe spring settle before unmounting the row
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
      const scale = dragX.interpolate({
        inputRange: [-110, -50],
        outputRange: [1, 0.5],
        extrapolate: 'clamp',
      })

      return (
        <Pressable onPress={handleDelete} style={styles.deleteAction}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </Animated.View>
        </Pressable>
      )
    },
    [handleDelete, styles.deleteAction],
  )

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={60}
      overshootRight={false}
      friction={2}
      overshootFriction={8}
    >
      <View style={styles.card}>
        <Pressable
          onPress={handleExpand}
          disabled={isExpanded}
          style={({ pressed }) => [styles.container, pressed && styles.pressed]}
        >
          {/* ---- Social header (optional) ---- */}
          {user && (
            <View style={styles.header}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {user.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.headerName}>{user.displayName}</Text>
              <Text style={styles.headerAction}>saved a quote</Text>
            </View>
          )}

          {/* ---- Blockquote-style quote ---- */}
          <View style={styles.quoteBlock}>
            <Text style={styles.quote} numberOfLines={isExpanded ? undefined : 6}>
              {'\u201C'}{clipping.quote_text}{'\u201D'}
            </Text>
          </View>

          {/* ---- Compact source footer ---- */}
          <Pressable
            onPress={() => Linking.openURL(clipping.original_url)}
            hitSlop={8}
            style={({ pressed }) => [styles.attribution, pressed && styles.pressed]}
          >
            <Text style={styles.movieTitle}>{clipping.movie_title.toUpperCase()}</Text>
            <Text style={styles.separator}>{'\u00B7'}</Text>
            <Text style={styles.author}>{clipping.author_name.toUpperCase()}</Text>
          </Pressable>
        </Pressable>
      </View>
    </Swipeable>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundSecondary,
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      borderRadius: 12,
    },
    container: {
      padding: spacing.md,
    },
    pressed: {
      opacity: 0.6,
    },

    // ---- Social header ----
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    avatarFallback: {
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.secondaryText,
    },
    headerName: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.foreground,
      marginLeft: spacing.sm,
    },
    headerAction: {
      fontFamily: fonts.body,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
      marginLeft: spacing.xs,
    },

    // ---- Blockquote ----
    quoteBlock: {
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
      paddingLeft: 12,
      marginBottom: spacing.md,
    },
    quote: {
      fontFamily: fonts.body,
      fontSize: typography.title3.fontSize,
      lineHeight: typography.title3.lineHeight,
      color: colors.foreground,
    },

    // ---- Source footer ----
    attribution: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    movieTitle: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    separator: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      color: colors.secondaryText,
    },
    author: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    deleteAction: {
      backgroundColor: '#D7263D',
      justifyContent: 'center',
      alignItems: 'center',
      width: 110,
    },
  })
}
