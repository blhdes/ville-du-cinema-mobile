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

const HORIZONTAL_PAD = 20

export default function SettingsSkeleton() {
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
    <Animated.View style={[styles.wrapper, pulseStyle]}>
      {/* Account section */}
      <View style={styles.sectionLabel}>
        <View style={[styles.sectionLabelBone, { backgroundColor: bone }]} />
      </View>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowBorder, { borderBottomColor: bone }]}>
          <View style={[styles.labelBone, { width: 60, backgroundColor: bone }]} />
          <View style={[styles.valueBone, { width: 80, backgroundColor: bone }]} />
        </View>
        <View style={styles.row}>
          <View style={[styles.labelBone, { width: 50, backgroundColor: bone }]} />
          <View style={[styles.valueBone, { width: 140, backgroundColor: bone }]} />
        </View>
      </View>

      {/* Display section */}
      <View style={[styles.sectionLabel, { paddingTop: spacing.xl }]}>
        <View style={[styles.sectionLabelBone, { width: 60, backgroundColor: bone }]} />
      </View>
      <View style={styles.card}>
        {/* Appearance — label + description + segmented control */}
        <View style={[styles.rowTall, styles.rowBorder, { borderBottomColor: bone }]}>
          <View>
            <View style={[styles.labelBone, { width: 90, backgroundColor: bone }]} />
            <View style={[styles.descBone, { width: 180, backgroundColor: bone }]} />
          </View>
          <View style={[styles.segmentBone, { backgroundColor: bone }]} />
        </View>

        {/* Toggle rows: Watch Notifications, Drop Caps, Ratings */}
        <ToggleRowBone bone={bone} labelWidth={140} descWidth={170} />
        <ToggleRowBone bone={bone} labelWidth={80} descWidth={180} />
        <ToggleRowBone bone={bone} labelWidth={60} descWidth={150} />

        {/* Font Size — label + slider track */}
        <View style={styles.sliderSection}>
          <View style={[styles.labelBone, { width: 70, backgroundColor: bone }]} />
          <View style={styles.sliderRow}>
            <View style={[styles.sliderIconBone, { backgroundColor: bone }]} />
            <View style={[styles.sliderTrackBone, { backgroundColor: bone }]} />
            <View style={[styles.sliderIconBoneLarge, { backgroundColor: bone }]} />
          </View>
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.signOutSection}>
        <View style={[styles.signOutBone, { backgroundColor: bone }]} />
      </View>
    </Animated.View>
  )
}

function ToggleRowBone({ bone, labelWidth, descWidth }: {
  bone: string
  labelWidth: number
  descWidth: number
}) {
  return (
    <View style={[styles.row, styles.rowBorder, { borderBottomColor: bone }]}>
      <View style={styles.toggleRowLeft}>
        <View style={[styles.labelBone, { width: labelWidth, backgroundColor: bone }]} />
        <View style={[styles.descBone, { width: descWidth, backgroundColor: bone }]} />
      </View>
      <View style={[styles.toggleBone, { backgroundColor: bone }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  sectionLabel: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  sectionLabelBone: {
    height: 10,
    width: 70,
    borderRadius: 3,
  },
  card: {
    marginHorizontal: HORIZONTAL_PAD,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: HORIZONTAL_PAD,
    minHeight: 44,
  },
  rowTall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: HORIZONTAL_PAD,
    minHeight: 64,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelBone: {
    height: 14,
    borderRadius: 3,
  },
  valueBone: {
    height: 14,
    borderRadius: 3,
  },
  descBone: {
    height: 9,
    borderRadius: 3,
    marginTop: 6,
  },
  segmentBone: {
    width: 160,
    height: 32,
    borderRadius: 8,
  },
  toggleRowLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleBone: {
    width: 44,
    height: 26,
    borderRadius: 13,
  },
  sliderSection: {
    paddingVertical: spacing.md,
    paddingHorizontal: HORIZONTAL_PAD,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sliderIconBone: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  sliderTrackBone: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  sliderIconBoneLarge: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  signOutSection: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  signOutBone: {
    width: 70,
    height: 10,
    borderRadius: 3,
  },
})
