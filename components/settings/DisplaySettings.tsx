import { StyleSheet, Text, View } from 'react-native'
import Toggle from '@/components/ui/Toggle'
import ColumnSelector from '@/components/ui/ColumnSelector'
import { colors, fonts, spacing, typography } from '@/theme'

interface DisplaySettingsProps {
  hideUserlistMain: boolean
  feedGridColumns: 1 | 2 | 3
  hideWatchNotifications: boolean
  onSetHideUserlistMain: (value: boolean) => void
  onSetFeedGridColumns: (value: 1 | 2 | 3) => void
  onSetHideWatchNotifications: (value: boolean) => void
  disabled?: boolean
}

export default function DisplaySettings({
  hideUserlistMain,
  feedGridColumns,
  hideWatchNotifications,
  onSetHideUserlistMain,
  onSetFeedGridColumns,
  onSetHideWatchNotifications,
  disabled,
}: DisplaySettingsProps) {
  return (
    <View style={styles.card}>
      {/* Hide user list */}
      <View style={[styles.row, styles.rowBorder]}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Hide User List</Text>
          <Text style={styles.description}>Hide the following panel on the feed</Text>
        </View>
        <Toggle
          value={hideUserlistMain}
          onValueChange={onSetHideUserlistMain}
          disabled={disabled}
        />
      </View>

      {/* Feed columns */}
      <View style={[styles.row, styles.rowBorder]}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Feed Columns</Text>
          <Text style={styles.description}>Number of columns in the feed grid</Text>
        </View>
        <ColumnSelector
          value={feedGridColumns}
          onValueChange={onSetFeedGridColumns}
          disabled={disabled}
        />
      </View>

      {/* Hide watch notifications */}
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Hide Watch Notifications</Text>
          <Text style={styles.description}>Only show reviews, hide watch activity</Text>
        </View>
        <Toggle
          value={hideWatchNotifications}
          onValueChange={onSetHideWatchNotifications}
          disabled={disabled}
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
