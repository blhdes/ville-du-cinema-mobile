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
 * "self"     — ProfileScreen: horizontal header + village accordion + clippings
 * "external" — ExternalProfileScreen (Letterboxd): centered header + review cards
 * "native"   — NativeProfileScreen (Village user): centered header + clippings
 */
interface ProfileSkeletonProps {
  variant: 'self' | 'external' | 'native'
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

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }))
  const bone = colors.border

  return (
    <View style={styles.wrapper}>
      <Animated.View style={pulseStyle}>
        {variant === 'self' && <SelfHeaderBones bone={bone} />}
        {variant === 'external' && <ExternalHeaderBones bone={bone} />}
        {variant === 'native' && <NativeHeaderBones bone={bone} />}
      </Animated.View>

      {/* Item skeletons below the header */}
      {variant === 'external' ? (
        <>
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </>
      ) : (
        <>
          <ClippingCardBones bone={bone} />
          <ClippingCardBones bone={bone} />
        </>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Self — mirrors ProfileScreen (horizontal layout)
// ---------------------------------------------------------------------------

function SelfHeaderBones({ bone }: { bone: string }) {
  return (
    <View style={styles.selfContainer}>
      {/* Avatar + text row */}
      <View style={styles.selfRow}>
        <View style={[styles.avatarBone, { backgroundColor: bone }]} />
        <View style={styles.selfIdentity}>
          <View style={[styles.nameBone, { width: '70%', backgroundColor: bone }]} />
          <View style={[styles.metaBone, { width: '50%', backgroundColor: bone }]} />
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

      {/* Village accordion row */}
      <View style={styles.accordionRow}>
        <View style={[styles.accordionLabelBone, { backgroundColor: bone }]} />
        <View style={[styles.accordionChevron, { backgroundColor: bone }]} />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: bone }]} />

      {/* CLIPPINGS section label */}
      <View style={[styles.sectionLabelBone, { backgroundColor: bone }]} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// External — mirrors ExternalProfileScreen (Letterboxd, centered layout)
// ---------------------------------------------------------------------------

function ExternalHeaderBones({ bone }: { bone: string }) {
  return (
    <View style={styles.externalContainer}>
      <View style={[styles.avatarBone, { backgroundColor: bone }]} />
      <View style={[styles.centerBone, { width: 160, height: 22, marginTop: spacing.md, backgroundColor: bone }]} />
      <View style={[styles.centerBone, { width: 90, height: 10, marginTop: spacing.sm, backgroundColor: bone }]} />
      <View style={styles.externalBio}>
        <View style={[styles.bioLine, { width: '90%', alignSelf: 'center', backgroundColor: bone }]} />
        <View style={[styles.bioLine, { width: '100%', alignSelf: 'center', backgroundColor: bone }]} />
        <View style={[styles.bioLine, { width: '80%', alignSelf: 'center', backgroundColor: bone }]} />
        <View style={[styles.bioLineLast, { width: '50%', alignSelf: 'center', backgroundColor: bone }]} />
      </View>
      <View style={styles.metadataRow}>
        <View style={[styles.metadataBone, { backgroundColor: bone }]} />
        <View style={[styles.metadataBone, { backgroundColor: bone }]} />
      </View>
      <View style={[styles.divider, { backgroundColor: bone }]} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Native — mirrors NativeProfileScreen (Village user, centered layout)
// ---------------------------------------------------------------------------

function NativeHeaderBones({ bone }: { bone: string }) {
  return (
    <View style={styles.externalContainer}>
      <View style={[styles.avatarBone, { backgroundColor: bone }]} />
      <View style={[styles.centerBone, { width: 160, height: 22, marginTop: spacing.md, backgroundColor: bone }]} />
      <View style={[styles.centerBone, { width: 90, height: 10, marginTop: spacing.sm, backgroundColor: bone }]} />
      <View style={styles.externalBio}>
        <View style={[styles.bioLine, { width: '90%', alignSelf: 'center', backgroundColor: bone }]} />
        <View style={[styles.bioLine, { width: '75%', alignSelf: 'center', backgroundColor: bone }]} />
        <View style={[styles.bioLineLast, { width: '55%', alignSelf: 'center', backgroundColor: bone }]} />
      </View>
      {/* Clippings count + follow button */}
      <View style={styles.metadataRow}>
        <View style={[styles.metadataBone, { backgroundColor: bone }]} />
        <View style={[styles.metadataBone, { backgroundColor: bone }]} />
      </View>
      <View style={[styles.divider, { backgroundColor: bone }]} />
      {/* CLIPPINGS section label */}
      <View style={[styles.sectionLabelBone, { backgroundColor: bone, alignSelf: 'flex-start' }]} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Clipping card bones — mirrors ClippingCard layout
// ---------------------------------------------------------------------------

function ClippingCardBones({ bone }: { bone: string }) {
  return (
    <View style={styles.clippingCard}>
      {/* Header: avatar + display name + movie title */}
      <View style={styles.clippingHeader}>
        <View style={[styles.clippingAvatar, { backgroundColor: bone }]} />
        <View style={styles.clippingMeta}>
          <View style={[styles.clippingMetaLine, { width: '35%', backgroundColor: bone }]} />
          <View style={[styles.clippingMetaLine, { width: '55%', backgroundColor: bone }]} />
        </View>
      </View>
      {/* Quote lines — taller height to match the large italic quote text */}
      <View style={[styles.quoteLine, { width: '100%', backgroundColor: bone }]} />
      <View style={[styles.quoteLine, { width: '95%', backgroundColor: bone }]} />
      <View style={[styles.quoteLine, { width: '88%', backgroundColor: bone }]} />
      <View style={[styles.quoteLineLast, { width: '50%', backgroundColor: bone }]} />
      <View style={[styles.divider, { backgroundColor: bone, marginTop: spacing.lg }]} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },

  // ---- Self ----
  selfContainer: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
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
  accordionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  accordionLabelBone: {
    height: 10,
    width: 120,
    borderRadius: 3,
  },
  accordionChevron: {
    width: 14,
    height: 10,
    borderRadius: 2,
  },

  // ---- External / Native ----
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

  // ---- Section label ----
  sectionLabelBone: {
    height: 10,
    width: 80,
    borderRadius: 3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // ---- Clipping card ----
  clippingCard: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: spacing.xl,
  },
  clippingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  clippingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.sm,
  },
  clippingMeta: {
    flex: 1,
    gap: 6,
  },
  clippingMetaLine: {
    height: 10,
    borderRadius: 3,
  },
  quoteLine: {
    height: 16,
    borderRadius: 3,
    marginBottom: 10,
  },
  quoteLineLast: {
    height: 16,
    borderRadius: 3,
  },

  // ---- Shared ----
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
