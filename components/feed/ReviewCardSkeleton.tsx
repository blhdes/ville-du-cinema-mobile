import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '@/contexts/ThemeContext'
import { spacing } from '@/theme'
import FeedDivider from '@/components/ui/FeedDivider'

const HORIZONTAL_PAD = 20

export default function ReviewCardSkeleton() {
  const { colors } = useTheme()
  const pulse = useSharedValue(0.4)

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    )
  }, [pulse])

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }))

  const bone = colors.border

  return (
    <View style={styles.article}>
      <Animated.View style={pulseStyle}>
        {/* Movie title */}
        <View style={[styles.titleBone, { backgroundColor: bone }]} />
        <View style={[styles.titleBoneShort, { backgroundColor: bone }]} />

        {/* Meta row: avatar + name + date */}
        <View style={styles.metaRow}>
          <View style={[styles.avatarBone, { backgroundColor: bone }]} />
          <View style={[styles.metaBone, { backgroundColor: bone }]} />
        </View>

        {/* Body text lines */}
        <View style={[styles.bodyLine, { width: '100%', backgroundColor: bone }]} />
        <View style={[styles.bodyLine, { width: '95%', backgroundColor: bone }]} />
        <View style={[styles.bodyLine, { width: '100%', backgroundColor: bone }]} />
        <View style={[styles.bodyLine, { width: '80%', backgroundColor: bone }]} />
        <View style={[styles.bodyLine, { width: '90%', backgroundColor: bone }]} />
        <View style={[styles.bodyLineLast, { width: '45%', backgroundColor: bone }]} />
      </Animated.View>

      <FeedDivider />
    </View>
  )
}

const styles = StyleSheet.create({
  article: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  titleBone: {
    height: 22,
    width: '75%',
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  titleBoneShort: {
    height: 22,
    width: '50%',
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarBone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  metaBone: {
    height: 10,
    width: 140,
    borderRadius: 3,
  },
  bodyLine: {
    height: 12,
    borderRadius: 3,
    marginBottom: 10,
  },
  bodyLineLast: {
    height: 12,
    borderRadius: 3,
  },
})
