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
import ReviewCardSkeleton from '@/components/feed/ReviewCardSkeleton'

const AVATAR_SIZE = 72
const HORIZONTAL_PAD = 20

/**
 * "self" — matches ProfileHeader's horizontal layout (avatar left, text right).
 * "external" — matches ExternalProfileHeader's centered layout.
 */
interface ProfileSkeletonProps {
  variant: 'self' | 'external'
}

export default function ProfileSkeleton({ variant }: ProfileSkeletonProps) {
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
    <View style={styles.wrapper}>
      <Animated.View style={pulseStyle}>
        {variant === 'self' ? (
          <SelfHeaderBones bone={bone} />
        ) : (
          <ExternalHeaderBones bone={bone} />
        )}
      </Animated.View>

      {/* Feed placeholder — 3 review card skeletons */}
      <ReviewCardSkeleton />
      <ReviewCardSkeleton />
      <ReviewCardSkeleton />
    </View>
  )
}

/** Horizontal layout matching ProfileHeader */
function SelfHeaderBones({ bone }: { bone: string }) {
  return (
    <View style={styles.selfContainer}>
      {/* Avatar + text row */}
      <View style={styles.selfRow}>
        <View style={[styles.avatarBone, { backgroundColor: bone }]} />

        <View style={styles.selfIdentity}>
          {/* Display name */}
          <View style={[styles.nameBone, { width: '70%', backgroundColor: bone }]} />
          {/* @username */}
          <View style={[styles.metaBone, { width: '50%', backgroundColor: bone }]} />
          {/* Email */}
          <View style={[styles.metaBone, { width: '60%', backgroundColor: bone }]} />
        </View>
      </View>

      {/* Bio lines */}
      <View style={styles.selfBio}>
        <View style={[styles.bioLine, { width: '100%', backgroundColor: bone }]} />
        <View style={[styles.bioLine, { width: '85%', backgroundColor: bone }]} />
        <View style={[styles.bioLineLast, { width: '60%', backgroundColor: bone }]} />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: bone }]} />
    </View>
  )
}

/** Centered layout matching ExternalProfileHeader */
function ExternalHeaderBones({ bone }: { bone: string }) {
  return (
    <View style={styles.externalContainer}>
      {/* Avatar */}
      <View style={[styles.avatarBone, { backgroundColor: bone }]} />

      {/* Display name */}
      <View style={[styles.centerBone, { width: 160, height: 22, marginTop: spacing.md, backgroundColor: bone }]} />

      {/* @username */}
      <View style={[styles.centerBone, { width: 90, height: 10, marginTop: spacing.sm, backgroundColor: bone }]} />

      {/* Bio lines — centered */}
      <View style={styles.externalBio}>
        <View style={[styles.bioLine, { width: '90%', alignSelf: 'center', backgroundColor: bone }]} />
        <View style={[styles.bioLine, { width: '100%', alignSelf: 'center', backgroundColor: bone }]} />
        <View style={[styles.bioLine, { width: '80%', alignSelf: 'center', backgroundColor: bone }]} />
        <View style={[styles.bioLineLast, { width: '50%', alignSelf: 'center', backgroundColor: bone }]} />
      </View>

      {/* Metadata row placeholder */}
      <View style={styles.metadataRow}>
        <View style={[styles.metadataBone, { backgroundColor: bone }]} />
        <View style={[styles.metadataBone, { backgroundColor: bone }]} />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: bone }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },

  // ---- Self (horizontal) variant ----
  selfContainer: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  selfRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selfIdentity: {
    flex: 1,
    marginLeft: spacing.md,
  },
  selfBio: {
    marginTop: spacing.lg,
  },

  // ---- External (centered) variant ----
  externalContainer: {
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: spacing.xl,
  },
  externalBio: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  metadataBone: {
    width: 80,
    height: 10,
    borderRadius: 3,
  },

  // ---- Shared bones ----
  avatarBone: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  nameBone: {
    height: 22,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  metaBone: {
    height: 10,
    borderRadius: 3,
    marginBottom: 6,
  },
  centerBone: {
    borderRadius: 4,
  },
  bioLine: {
    height: 12,
    borderRadius: 3,
    marginBottom: 10,
  },
  bioLineLast: {
    height: 12,
    borderRadius: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
})
