import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Slider from '@react-native-community/slider'
import Toggle from '@/components/ui/Toggle'
import { colors, fonts, spacing, typography } from '@/theme'

interface DisplaySettingsProps {
  hideWatchNotifications: boolean
  useDropCap: boolean
  hideRatings: boolean
  fontSizeLevel: number
  onSetHideWatchNotifications: (value: boolean) => void
  onSetUseDropCap: (value: boolean) => void
  onSetHideRatings: (value: boolean) => void
  onSetFontSizeLevel: (value: number) => void
  disableRemote?: boolean
}

export default function DisplaySettings({
  hideWatchNotifications,
  useDropCap,
  hideRatings,
  fontSizeLevel,
  onSetHideWatchNotifications,
  onSetUseDropCap,
  onSetHideRatings,
  onSetFontSizeLevel,
  disableRemote,
}: DisplaySettingsProps) {
  const [localFontSize, setLocalFontSize] = useState(fontSizeLevel)

  return (
    <View style={styles.card}>
      {/* Hide watch notifications */}
      <View style={[styles.row, styles.rowBorder]}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Hide Watch Notifications</Text>
          <Text style={styles.description}>Only show reviews, hide watch activity</Text>
        </View>
        <Toggle
          value={hideWatchNotifications}
          onValueChange={onSetHideWatchNotifications}
          disabled={disableRemote}
        />
      </View>

      {/* Use drop caps */}
      <View style={[styles.row, styles.rowBorder]}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Use Drop Caps</Text>
          <Text style={styles.description}>Stylize the first letter of reviews</Text>
        </View>
        <Toggle
          value={useDropCap}
          onValueChange={onSetUseDropCap}
        />
      </View>

      {/* Hide ratings */}
      <View style={[styles.row, styles.rowBorder]}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Hide Ratings</Text>
          <Text style={styles.description}>Hide star ratings on review cards</Text>
        </View>
        <Toggle
          value={hideRatings}
          onValueChange={onSetHideRatings}
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
            minimumTrackTintColor={colors.secondaryText}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.foreground}
          />
          <Text style={styles.sliderIconLarge}>A</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: typography.caption.fontSize,
    color: colors.secondaryText,
    marginTop: 2,
  },
  sliderRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondaryText,
  },
  sliderIconLarge: {
    fontFamily: fonts.body,
    fontSize: 22,
    color: colors.secondaryText,
  },
})
