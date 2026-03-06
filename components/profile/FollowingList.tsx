import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { FollowedUser } from '@/types/database'
import { colors, fonts, spacing, typography } from '@/theme'
import LetterboxdDots from '@/components/ui/LetterboxdDots'

interface FollowingListProps {
  users: FollowedUser[]
}

const HORIZONTAL_PAD = 20

export default function FollowingList({ users }: FollowingListProps) {
  return (
    <View>
      <Text style={styles.sectionLabel}>
        FOLLOWING ({users.length})
      </Text>

      {users.length === 0 ? (
        <Text style={styles.emptyText}>No users followed yet</Text>
      ) : (
        users.map((user, index) => (
          <Pressable
            key={user.username}
            style={({ pressed }) => [
              styles.row,
              index < users.length - 1 && styles.rowBorder,
              pressed && styles.rowPressed,
            ]}
            onPress={() =>
              Linking.openURL(`https://letterboxd.com/${user.username}/`)
            }
          >
            <View style={styles.rowContent}>
              <Text style={styles.displayName}>
                {user.display_name || user.username}
              </Text>
              <Text style={styles.handle}>@{user.username.toUpperCase()}</Text>
            </View>
            <LetterboxdDots size={20} />
          </Pressable>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: fonts.body,
    fontSize: typography.magazineMeta.fontSize,
    lineHeight: typography.magazineMeta.lineHeight,
    letterSpacing: typography.magazineMeta.letterSpacing,
    color: colors.secondaryText,
    paddingHorizontal: HORIZONTAL_PAD,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: HORIZONTAL_PAD,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  displayName: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.foreground,
  },
  handle: {
    fontFamily: fonts.body,
    fontSize: typography.magazineMeta.fontSize,
    lineHeight: typography.magazineMeta.lineHeight,
    letterSpacing: typography.magazineMeta.letterSpacing,
    color: colors.secondaryText,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fonts.bodyItalic,
    fontSize: typography.magazineBody.fontSize,
    lineHeight: typography.magazineBody.lineHeight,
    color: colors.secondaryText,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: HORIZONTAL_PAD,
  },
})
