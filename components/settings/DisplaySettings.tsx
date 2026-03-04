import { StyleSheet, Text, View } from 'react-native'
import Toggle from '@/components/ui/Toggle'
import { colors, fonts, spacing, typography } from '@/theme'

interface DisplaySettingsProps {
  hideWatchNotifications: boolean
  useDropCap: boolean
  hideRatings: boolean
  onSetHideWatchNotifications: (value: boolean) => void
  onSetUseDropCap: (value: boolean) => void
  onSetHideRatings: (value: boolean) => void
  disableRemote?: boolean
}

export default function DisplaySettings({
  hideWatchNotifications,
  useDropCap,
  hideRatings,
  onSetHideWatchNotifications,
  onSetUseDropCap,
  onSetHideRatings,
  disableRemote,
}: DisplaySettingsProps) {
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
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Hide Ratings</Text>
          <Text style={styles.description}>Hide star ratings on review cards</Text>
        </View>
        <Toggle
          value={hideRatings}
          onValueChange={onSetHideRatings}
        />
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
})
