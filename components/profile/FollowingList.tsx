import { useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { FollowedUser } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { useAvatarUrl } from '@/services/avatarCache'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import LetterboxdDots from '@/components/ui/LetterboxdDots'

const AVATAR_SIZE = 32

interface FollowingListProps {
  users: FollowedUser[]
}

const HORIZONTAL_PAD = 20

/** Per-row component so we can call the useAvatarUrl hook per user. */
function FollowingRow({ user, isLast }: { user: FollowedUser; isLast: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const avatarUrl = useAvatarUrl(user.username)

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Pressable
        style={({ pressed }) => [styles.rowContent, pressed && styles.rowPressed]}
        onPress={() => navigation.navigate('ExternalProfile', { username: user.username })}
      >
        {avatarUrl ? (
          <Image source={avatarUrl} style={styles.avatar} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(user.display_name || user.username)[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.textColumn}>
          <Text style={styles.displayName}>
            {user.display_name || user.username}
          </Text>
          <Text style={styles.handle}>@{user.username.toUpperCase()}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => Linking.openURL(`https://letterboxd.com/${user.username}/`)}
        hitSlop={8}
        style={({ pressed }) => pressed && styles.rowPressed}
      >
        <LetterboxdDots size={20} />
      </Pressable>
    </View>
  )
}

export default function FollowingList({ users }: FollowingListProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  if (users.length === 0) {
    return <Text style={styles.emptyText}>No users followed yet</Text>
  }

  return (
    <View>
      {users.map((user, index) => (
        <FollowingRow
          key={user.username}
          user={user}
          isLast={index === users.length - 1}
        />
      ))}
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      marginRight: spacing.md,
    },
    avatarPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontFamily: fonts.heading,
      fontSize: 13,
      color: colors.secondaryText,
    },
    textColumn: {
      flex: 1,
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
