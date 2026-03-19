import { memo, useCallback, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

const ACTION_WIDTH = 180

/** Convert a hex color to rgba with the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface SwipeableRowProps {
  children: React.ReactNode
  /** Fires when the swipe completes (full swipe to the end). */
  onAction: () => void
  /** Accent color for the action (used for icon tint, and faint wash if enabled). */
  actionColor: string
  /** Ionicons icon name shown in the action area. */
  actionIcon: keyof typeof Ionicons.glyphMap
  /** 'wash' = faint 12% accent bg, 'minimal' = no bg, just the icon. Default: 'wash'. */
  variant?: 'wash' | 'minimal'
}

function SwipeableRow({ children, onAction, actionColor, actionIcon, variant = 'wash' }: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null)
  const fired = useRef(false)

  const handleOpen = useCallback((direction: 'left' | 'right') => {
    if (direction === 'right' && !fired.current) {
      fired.current = true
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      swipeableRef.current?.close()
      Promise.resolve(onAction()).finally(() => {
        fired.current = false
      })
    }
  }, [onAction])

  const bgColor = variant === 'wash' ? hexToRgba(actionColor, 0.12) : 'transparent'

  const renderRightActions = useCallback(
    (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const translateX = dragX.interpolate({
        inputRange: [-ACTION_WIDTH, 0],
        outputRange: [0, ACTION_WIDTH],
        extrapolate: 'clamp',
      })

      const opacity = dragX.interpolate({
        inputRange: [-ACTION_WIDTH, -60],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })

      return (
        <View style={styles.actionClip}>
          <Animated.View style={[styles.actionContainer, { backgroundColor: bgColor, transform: [{ translateX }] }]}>
            <Animated.View style={{ opacity }}>
              <Ionicons name={actionIcon} size={22} color={actionColor} />
            </Animated.View>
          </Animated.View>
        </View>
      )
    },
    [actionColor, actionIcon, bgColor],
  )

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={ACTION_WIDTH}
      overshootRight={false}
      onSwipeableWillOpen={handleOpen}
      friction={1}
    >
      {children}
    </Swipeable>
  )
}

export default memo(SwipeableRow)

const styles = StyleSheet.create({
  actionClip: {
    width: ACTION_WIDTH,
    overflow: 'hidden',
  },
  actionContainer: {
    width: ACTION_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
