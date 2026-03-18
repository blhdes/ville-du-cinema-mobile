import { useEffect, useMemo } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing } from '@/theme'
import { useTypography } from '@/hooks/useTypography'

const DURATION = 250
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface FollowButtonProps {
  isFollowing: boolean
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export default function FollowButton({ isFollowing, onPress, style }: FollowButtonProps) {
  const { colors } = useTheme()
  const typography = useTypography()
  const progress = useSharedValue(isFollowing ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(isFollowing ? 1 : 0, { duration: DURATION })
  }, [isFollowing, progress])

  const buttonStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, 'transparent'],
    ),
  }))

  const followOpacity = useAnimatedStyle(() => ({ opacity: 1 - progress.value }))
  const followingOpacity = useAnimatedStyle(() => ({ opacity: progress.value }))

  const followColor = useAnimatedStyle(() => ({ color: colors.foreground }))
  const followingColor = useAnimatedStyle(() => ({ color: colors.secondaryText }))

  return (
    <AnimatedPressable style={[styles.button, buttonStyle, style]} onPress={onPress}>
      <View style={styles.textContainer}>
        <Animated.Text style={[styles.text, { fontSize: typography.magazineMeta.fontSize, letterSpacing: typography.magazineMeta.letterSpacing }, followingColor, followingOpacity]}>
          Following
        </Animated.Text>
        <Animated.Text style={[styles.text, styles.textOverlay, { fontSize: typography.magazineMeta.fontSize, letterSpacing: typography.magazineMeta.letterSpacing }, followColor, followOpacity]}>
          Follow
        </Animated.Text>
      </View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.body,
  },
  textOverlay: {
    position: 'absolute',
  },
})
