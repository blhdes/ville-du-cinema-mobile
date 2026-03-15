import { useMemo, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useUserLists } from '@/hooks/useUserLists'
import { useAvatarUrl } from '@/services/avatarCache'
import { useTheme } from '@/contexts/ThemeContext'
import type { ThemeColors } from '@/theme'

const AVATAR_SIZE = 26
const OVERLAP = -10

interface DrawerTriggerProps {
  onPress: () => void
}

/** A single tiny circular avatar that reactively loads from the avatar cache. */
function MiniAvatar({ username }: { username: string }) {
  const url = useAvatarUrl(username)
  if (!url) return null
  return (
    <Image
      source={url}
      style={styles.avatar}
      cachePolicy="memory-disk"
    />
  )
}

export default function DrawerTrigger({ onPress }: DrawerTriggerProps) {
  const { users } = useUserLists()
  const { colors } = useTheme()
  const themed = useMemo(() => themedStyles(colors), [colors])

  // Seed a random offset once per mount so the facepile shows different people each launch
  const seed = useRef(Math.random()).current
  const displayUsers = useMemo(() => {
    if (users.length <= 3) return users
    const shuffled = [...users].sort(() => seed - 0.5)
    return shuffled.slice(0, 3)
  }, [users, seed])

  return (
    <Pressable onPress={onPress} hitSlop={8} style={themed.container}>
      {displayUsers.length >= 2 ? (
        <View style={styles.facepile}>
          {displayUsers.map((user, i) => (
            <View
              key={user.username}
              style={i > 0 ? { marginLeft: OVERLAP } : undefined}
            >
              <MiniAvatar username={user.username} />
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
  })
}
