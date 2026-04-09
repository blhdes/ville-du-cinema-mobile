import { memo, useCallback } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing } from '@/theme'
import { useTypography } from '@/hooks/useTypography'

interface RepostHeaderProps {
  owner: {
    displayName: string
    userId?: string
    username?: string
  }
}

function RepostHeader({ owner }: RepostHeaderProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()

  const handlePress = useCallback(() => {
    if (owner.userId) {
      navigation.navigate('NativeProfile', { userId: owner.userId, username: owner.username })
    }
  }, [navigation, owner.userId, owner.username])

  return (
    <Pressable
      style={({ pressed }) => [styles.header, pressed && !!owner.userId && styles.pressed]}
      onPress={handlePress}
      disabled={!owner.userId}
    >
      <Ionicons name="repeat-outline" size={16} color={colors.teal} style={styles.icon} />
      <Text
        style={[styles.label, {
          fontSize: typography.magazineMeta.fontSize,
          lineHeight: typography.magazineMeta.lineHeight,
          letterSpacing: typography.magazineMeta.letterSpacing,
          color: colors.secondaryText,
        }]}
        numberOfLines={1}
      >
        Reposted by {owner.displayName}
      </Text>
    </Pressable>
  )
}

export default memo(RepostHeader)

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: spacing.xl,
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: fonts.system,
    flex: 1,
  },
})
