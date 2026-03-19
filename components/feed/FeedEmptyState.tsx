import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing } from '@/theme'
import { useTypography } from '@/hooks/useTypography'

const SQUARE = 96
const ACCENT_OFFSET = 8
const LINE_HEIGHT = 3

// Line Y positions as absolute px values inside the foreground square
const POS_TOP = SQUARE * 0.2    // 20% ≈ 19px
const POS_MID = SQUARE * 0.5    // 50% ≈ 48px
const POS_BOT = SQUARE * 0.8    // 80% ≈ 77px

// Total loop: 900 + 1200 + 900 + 1200 + 900 + 900 = 6000ms
// Mirrors web app AnimatedWelcomeLogo keyframes

export default function FeedEmptyState() {
  const { colors } = useTheme()
  const typography = useTypography()

  const containerOpacity = useSharedValue(0)
  const containerScale = useSharedValue(0.95)
  const lineY = useSharedValue(POS_TOP)

  useEffect(() => {
    containerOpacity.value = withDelay(300, withTiming(1, { duration: 700 }))
    containerScale.value = withDelay(300, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }))

    lineY.value = withRepeat(
      withSequence(
        withTiming(POS_TOP, { duration: 900 }),                                           // hold at top
        withTiming(POS_MID, { duration: 1200, easing: Easing.inOut(Easing.ease) }),       // slide to center
        withTiming(POS_MID, { duration: 900 }),                                           // hold at center
        withTiming(POS_BOT, { duration: 1200, easing: Easing.inOut(Easing.ease) }),       // slide to bottom
        withTiming(POS_BOT, { duration: 900 }),                                           // hold at bottom
        withTiming(POS_TOP, { duration: 900, easing: Easing.inOut(Easing.ease) }),        // return to top
      ),
      -1,
    )

    return () => {
      cancelAnimation(containerOpacity)
      cancelAnimation(containerScale)
      cancelAnimation(lineY)
    }
  }, [containerOpacity, containerScale, lineY])

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }))

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lineY.value }],
  }))

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Two-square animated logo */}
      <View style={styles.logoWrapper}>
        {/* Accent square — red, sits behind and offset */}
        <View style={[styles.accentSquare, { borderColor: colors.red }]} />

        {/* Foreground square — clips the sliding line */}
        <View style={[styles.foreSquare, { borderColor: colors.foreground, backgroundColor: colors.background }]}>
          <Text style={[styles.vLetter, { color: colors.foreground }]}>V</Text>
          <Animated.View style={[styles.line, { backgroundColor: colors.red }, lineStyle]} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.foreground, fontSize: typography.title1.fontSize, lineHeight: typography.title1.lineHeight }]}>Village du Cin{'\u00E9'}ma</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight }]}>
        Tap the Users button to add Letterboxd accounts and see their recent activity.
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  logoWrapper: {
    width: SQUARE + ACCENT_OFFSET,
    height: SQUARE + ACCENT_OFFSET,
    marginBottom: spacing.md,
  },
  accentSquare: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: SQUARE,
    height: SQUARE,
    borderWidth: 2,
  },
  foreSquare: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SQUARE,
    height: SQUARE,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vLetter: {
    fontFamily: fonts.heading,
    fontSize: 56,
    lineHeight: 68,
  },
  line: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: LINE_HEIGHT,
  },
  title: {
    fontFamily: fonts.heading,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.system,
    textAlign: 'center',
  },
})
