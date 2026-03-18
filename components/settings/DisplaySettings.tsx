import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Slider from '@react-native-community/slider'
import Toggle from '@/components/ui/Toggle'
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'

interface DisplaySettingsProps {
  showWatchNotifications: boolean
  useDropCap: boolean
  showRatings: boolean
  fontMultiplier: number
  onSetShowWatchNotifications: (value: boolean) => void
  onSetUseDropCap: (value: boolean) => void
  onSetShowRatings: (value: boolean) => void
  onSetFontMultiplier: (value: number) => void
  disableRemote?: boolean
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function DisplaySettings({
  showWatchNotifications,
  useDropCap,
  showRatings,
  fontMultiplier,
  onSetShowWatchNotifications,
  onSetUseDropCap,
  onSetShowRatings,
  onSetFontMultiplier,
  disableRemote,
}: DisplaySettingsProps) {
  const { preference, setPreference, colors } = useTheme()
  const typography = useTypography()
  const [localFontSize, setLocalFontSize] = useState(fontMultiplier)
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  return (
    <View style={styles.card}>
      {/* Theme selector */}
      <View style={[styles.row, styles.rowBorder]}>
        <View style={styles.themeRow}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Appearance</Text>
            <Text style={styles.description}>
              {preference === 'system'
                ? 'Follows your device appearance'
                : 'Manual override active'}
            </Text>
          </View>
          <View style={styles.segmentedControl}>
            {THEME_OPTIONS.map((option) => {
              const isActive = preference === option.value
              return (
                <Pressable
                  key={option.value}
                  style={[styles.segment, isActive && styles.segmentActive]}
                  onPress={() => setPreference(option.value)}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>

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
            minimumValue={0.8}
            maximumValue={1.4}
            value={localFontSize}
            onValueChange={setLocalFontSize}
            onSlidingComplete={onSetFontMultiplier}
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

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
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
    themeRow: {
      flex: 1,
      gap: spacing.sm,
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
      letterSpacing: typography.magazineMeta.letterSpacing,
      marginTop: 2,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      padding: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      borderRadius: 6,
    },
    segmentActive: {
      backgroundColor: colors.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    segmentText: {
      fontFamily: fonts.body,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
    },
    segmentTextActive: {
      color: colors.foreground,
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
}
