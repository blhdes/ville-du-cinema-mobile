import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { FollowedUser } from '@/types/database'
import { colors, fonts, spacing } from '@/theme'
import SectionHeader from '@/components/ui/SectionHeader'

interface FollowingListProps {
  users: FollowedUser[]
}

export default function FollowingList({ users }: FollowingListProps) {
  if (users.length === 0) {
    return (
      <View>
        <SectionHeader title="FOLLOWING" />
        <Text style={styles.emptyText}>No users followed yet</Text>
      </View>
    )
  }

  return (
    <View>
      <SectionHeader title={`FOLLOWING (${users.length})`} />
      {users.map((user) => (
        <Pressable
          key={user.username}
          style={styles.row}
          onPress={() =>
            Linking.openURL(`https://letterboxd.com/${user.username}/`)
          }
        >
          <Text style={styles.username}>
            {user.display_name || user.username}
          </Text>
          <Text style={styles.handle}>@{user.username}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.sepiaLight,
  },
  username: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.black,
  },
  handle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.sepia,
  },
  emptyText: {
    fontFamily: fonts.bodyItalic,
    fontSize: 14,
    color: colors.sepia,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
})
