import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Slider from '@react-native-community/slider'
import Toggle from '@/components/ui/Toggle'
import { colors, fonts, spacing, typography } from '@/theme'

interface DisplaySettingsProps {
  showWatchNotifications: boolean
  useDropCap: boolean
  showRatings: boolean
  fontSizeLevel: number
  onSetShowWatchNotifications: (value: boolean) => void
  onSetUseDropCap: (value: boolean) => void
  onSetShowRatings: (value: boolean) => void
  onSetFontSizeLevel: (value: number) => void
  disableRemote?: boolean
}

export default function DisplaySettings({
  showWatchNotifications,
  useDropCap,
  showRatings,
  fontSizeLevel,
  onSetShowWatchNotifications,
  onSetUseDropCap,
  onSetShowRatings,
  onSetFontSizeLevel,
  disableRemote,
}: DisplaySettingsProps) {
  const [localFontSize, setLocalFontSize] = useState(fontSizeLevel)

  return (
    <View style={styles.card}>
      {/* Watch notifications */}
      <View style={[styles.row, styles.rowBorder]}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Watch Notifications</Text>
          <Text style={styles.description}>Show watch activity in the feed</Text>
        </View>
        <Toggle
          value={showWatchNotifications}
          onValueChange={onSetShowWatchNotifications}
          disabled={disableRemote}
        />
      </View>

      {/* Drop caps */}
      <View style={[styles.row, styles.rowBorder]}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Drop Caps</Text>
          <Text style={styles.description}>Stylize the first letter of reviews</Text>
        </View>
        <Toggle
          value={useDropCap}
          onValueChange={onSetUseDropCap}
        />
      </View>

      {/* Ratings */}
      <View style={[styles.row, styles.rowBorder]}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Ratings</Text>
          <Text style={styles.description}>Show star ratings on reviews</Text>
        </View>
        <Toggle
          value={showRatings}
          onValueChange={onSetShowRatings}
        />
      </View>

      {/* Font size */}
      <View style={styles.sliderRow}>
        <Text style={styles.label}>Font Size</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderIcon}>A</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            value={localFontSize}
            onValueChange={setLocalFontSize}
            onSlidingComplete={onSetFontSizeLevel}
            minimumTrackTintColor={colors.teal}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.white}
          />
          <Text style={styles.sliderIconLarge}>A</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: 20,
    minHeight: 44,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  labelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.foreground,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: typography.magazineMeta.fontSize,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: typography.magazineMeta.letterSpacing,
    marginTop: 2,
  },
  sliderRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: 20,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  sliderIcon: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.secondaryText,
  },
  sliderIconLarge: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.secondaryText,
  },
})
