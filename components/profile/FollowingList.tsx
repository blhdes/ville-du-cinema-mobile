import { useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { FollowedUser } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import LetterboxdDots from '@/components/ui/LetterboxdDots'

interface FollowingListProps {
  users: FollowedUser[]
}

const HORIZONTAL_PAD = 20

export default function FollowingList({ users }: FollowingListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View>
      <Text style={styles.sectionLabel}>
        FOLLOWING ({users.length})
      </Text>

      {users.length === 0 ? (
        <Text style={styles.emptyText}>No users followed yet</Text>
      ) : (
        users.map((user, index) => (
          <View
            key={user.username}
            style={[
              styles.row,
              index < users.length - 1 && styles.rowBorder,
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.rowContent,
                pressed && styles.rowPressed,
              ]}
              onPress={() =>
                navigation.navigate('ExternalProfile', { username: user.username })
              }
            >
              <Text style={styles.displayName}>
                {user.display_name || user.username}
              </Text>
              <Text style={styles.handle}>@{user.username.toUpperCase()}</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Linking.openURL(`https://letterboxd.com/${user.username}/`)
              }
              hitSlop={8}
              style={({ pressed }) => pressed && styles.rowPressed}
            >
              <LetterboxdDots size={20} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
}
