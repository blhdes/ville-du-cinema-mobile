import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { FollowedUser } from '@/types/database'
import { colors, fonts, spacing, typography } from '@/theme'

interface FollowingListProps {
  users: FollowedUser[]
}

export default function FollowingList({ users }: FollowingListProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>
        Following ({users.length})
      </Text>

      {users.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No users followed yet</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {users.map((user, index) => (
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
                <Text style={styles.username}>
                  {user.display_name || user.username}
                </Text>
                <Text style={styles.handle}>@{user.username}</Text>
              </View>
              <Text style={styles.chevron}>{'\u203A'}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.backgroundSecondary,
  },
  rowContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  username: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.foreground,
  },
  handle: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    color: colors.secondaryText,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.secondaryText,
    fontWeight: '300',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.secondaryText,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
})
