import { useCallback, useMemo, useRef, useState } from 'react'
import { Animated, LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
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
}

export default function ClippingCard({ clipping, onDeleted }: ClippingCardProps) {
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      onDeleted(clipping.id)
    } catch (error) {
      console.error('Failed to delete clipping:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      swipeableRef.current?.close()
    }
  }, [clipping.id, onDeleted])

  const renderRightActions = useCallback(
    (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const scale = dragX.interpolate({
        inputRange: [-80, -40],
        outputRange: [1, 0.6],
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
      rightThreshold={80}
      overshootRight={false}
      friction={2}
    >
      <View style={styles.cardBackground}>
        <Pressable
          onPress={handleExpand}
          disabled={isExpanded}
          style={({ pressed }) => [styles.container, pressed && styles.pressed]}
        >
          <Text style={styles.quote} numberOfLines={isExpanded ? undefined : 6}>
            {'\u201C'}{clipping.quote_text}{'\u201D'}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(clipping.original_url)}
            hitSlop={8}
            style={({ pressed }) => [styles.attribution, pressed && styles.pressed]}
          >
            <Text style={styles.movieTitle}>{clipping.movie_title.toUpperCase()}</Text>
            <Text style={styles.author}>BY {clipping.author_name.toUpperCase()}</Text>
          </Pressable>
        </Pressable>
      </View>
    </Swipeable>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cardBackground: {
      backgroundColor: colors.background,
    },
    container: {
      paddingHorizontal: 20,
      paddingVertical: spacing.xl,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pressed: {
      opacity: 0.6,
    },
    quote: {
      fontFamily: fonts.body,
      fontSize: typography.title2.fontSize,
      lineHeight: typography.title2.lineHeight,
      color: colors.foreground,
      marginBottom: spacing.md,
    },
    attribution: {
      gap: 4,
    },
    movieTitle: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.foreground,
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
      width: 80,
    },
  })
}
