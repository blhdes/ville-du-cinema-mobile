import { useMemo, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useUserLists } from '@/hooks/useUserLists'
import { useTheme } from '@/contexts/ThemeContext'
import type { ThemeColors } from '@/theme'

const AVATAR_SIZE = 26
const OVERLAP = -10
const MIN_FOR_FACEPILE = 2

interface DrawerTriggerProps {
  onPress: () => void
}

export default function DrawerTrigger({ onPress }: DrawerTriggerProps) {
  const { villageUsers } = useUserLists()
  const { colors } = useTheme()
  const themed = useMemo(() => themedStyles(colors), [colors])

  // Only Village users have a reliable avatar_url (no scraping)
  const usersWithAvatar = useMemo(
    () => villageUsers.filter((u) => !!u.avatar_url),
    [villageUsers],
  )

  // Seed a random offset once per mount so the facepile shows different people each launch
  const seed = useRef(Math.random()).current
  const displayUsers = useMemo(() => {
    if (usersWithAvatar.length <= 3) return usersWithAvatar
    return [...usersWithAvatar].sort(() => seed - 0.5).slice(0, 3)
  }, [usersWithAvatar, seed])

  const showFacepile = displayUsers.length >= MIN_FOR_FACEPILE

  return (
    <Pressable onPress={onPress} hitSlop={8} style={themed.container}>
      {showFacepile ? (
        <View style={styles.facepile}>
          {displayUsers.map((user, i) => (
            <View
              key={user.user_id}
              style={[
                themed.avatarRing,
                i > 0 ? { marginLeft: OVERLAP } : undefined,
              ]}
            >
              <Image
                source={user.avatar_url!}
                style={styles.avatar}
                cachePolicy="memory-disk"
              />
            </View>
          ))}
        </View>
      ) : (
        <Ionicons name="people-outline" size={22} color={colors.secondaryText} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  facepile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
})

function themedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'flex-start',
    },
    avatarRing: {
      borderRadius: (AVATAR_SIZE + 3) / 2,
      borderWidth: 1.5,
      borderColor: colors.background,
    },
  })
}
