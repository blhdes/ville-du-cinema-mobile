import { useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { FollowedUser, FollowedVillageUser } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { useAvatarUrl } from '@/services/avatarCache'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import LetterboxdDots from '@/components/ui/LetterboxdDots'
import LogoIcon from '@/components/ui/LogoIcon'

const AVATAR_SIZE = 32
const HORIZONTAL_PAD = 20

// ---------------------------------------------------------------------------
// Unified row item type
// ---------------------------------------------------------------------------

type RowItem =
  | { kind: 'letterboxd'; user: FollowedUser }
  | { kind: 'village'; user: FollowedVillageUser }

// ---------------------------------------------------------------------------
// Letterboxd row (uses avatar cache + opens Letterboxd URL on right)
// ---------------------------------------------------------------------------

function LetterboxdRow({ user, isLast }: { user: FollowedUser; isLast: boolean }) {
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
          <Text style={styles.displayName}>{user.display_name || user.username}</Text>
          <Text style={styles.handle}>@{user.username.toUpperCase()}</Text>
        </View>
      </Pressable>
      {/* Letterboxd dots — tappable link, also serves as the platform indicator */}
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

// ---------------------------------------------------------------------------
// Village row (direct avatar_url, Village logo as platform indicator)
// ---------------------------------------------------------------------------

function VillageRow({ user, isLast }: { user: FollowedVillageUser; isLast: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const initial = (user.display_name || user.username || '?')[0].toUpperCase()

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Pressable
        style={({ pressed }) => [styles.rowContent, pressed && styles.rowPressed]}
        onPress={() => navigation.navigate('NativeProfile', {
          userId: user.user_id,
          username: user.username ?? undefined,
        })}
      >
        {user.avatar_url ? (
          <Image source={user.avatar_url} style={styles.avatar} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={styles.textColumn}>
          <Text style={styles.displayName}>
            {user.display_name || user.username || 'Village User'}
          </Text>
          {user.username && (
            <Text style={styles.handle}>@{user.username.toUpperCase()}</Text>
          )}
        </View>
      </Pressable>
      {/* Village logo — platform indicator */}
      <LogoIcon size={18} fill={colors.secondaryText} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FollowingListProps {
  letterboxdUsers: FollowedUser[]
  villageUsers: FollowedVillageUser[]
}

export default function FollowingList({ letterboxdUsers, villageUsers }: FollowingListProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  // Village first, then Letterboxd
  const rows: RowItem[] = useMemo(() => [
    ...villageUsers.map((u): RowItem => ({ kind: 'village', user: u })),
    ...letterboxdUsers.map((u): RowItem => ({ kind: 'letterboxd', user: u })),
  ], [villageUsers, letterboxdUsers])

  if (rows.length === 0) {
    return <Text style={styles.emptyText}>No users followed yet</Text>
  }

  return (
    <View>
      {rows.map((item, index) => {
        const isLast = index === rows.length - 1
        if (item.kind === 'village') {
          return <VillageRow key={item.user.user_id} user={item.user} isLast={isLast} />
        }
        return <LetterboxdRow key={item.user.username} user={item.user} isLast={isLast} />
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
