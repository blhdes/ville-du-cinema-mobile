import { memo, useMemo, useCallback } from 'react'
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Clipping, Review } from '@/types/database'
import { deleteClipping } from '@/services/clippings'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import ReviewCard from '@/components/ReviewCard'
import SwipeableRow from '@/components/ui/SwipeableRow'

interface RepostCardProps {
  clipping: Clipping
  owner: {
    avatarUrl?: string
    displayName: string
    userId?: string
    username?: string
  }
  /** Called after a successful delete — removes from parent list state. */
  onDeleted?: (id: string) => void
}

function RepostCard({ clipping, owner, onDeleted }: RepostCardProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const review = clipping.review_json as Review

  const handleOwnerPress = useCallback(() => {
    if (owner.userId) {
      navigation.navigate('NativeProfile', { userId: owner.userId, username: owner.username })
    }
  }, [navigation, owner.userId, owner.username])

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onDeleted?.(clipping.id)
    deleteClipping(clipping.id).catch((error) => {
      console.error('Failed to delete repost:', error)
    })
  }, [clipping.id, onDeleted])

  const cardContent = (
    <View style={styles.surface}>
      {/* "Reposted by" header */}
      <Pressable
        style={({ pressed }) => [styles.header, pressed && owner.userId && styles.pressed]}
        onPress={handleOwnerPress}
        disabled={!owner.userId}
      >
        <Ionicons name="repeat-outline" size={16} color={colors.teal} style={styles.icon} />
        {owner.avatarUrl ? (
          <Image source={{ uri: owner.avatarUrl }} style={styles.avatar} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {owner.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.repostLabel} numberOfLines={1}>
          Reposted by {owner.displayName}
        </Text>
      </Pressable>

      {/* Embedded ReviewCard — not swipeable to prevent re-reposting */}
      <ReviewCard review={review} repostable={false} compact />
    </View>
  )

  if (!onDeleted) return cardContent

  return (
    <SwipeableRow
      onAction={handleDelete}
      actionColor={colors.red}
      actionIcon="trash-outline"
      actionLabel="Delete repost"
    >
      {cardContent}
    </SwipeableRow>
  )
}

export default memo(RepostCard)

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    surface: {
      backgroundColor: colors.background,
    },
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
    avatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: spacing.xs,
    },
    avatarFallback: {
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      fontFamily: fonts.system,
      fontSize: 8,
      color: colors.secondaryText,
    },
    repostLabel: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      flex: 1,
    },
  })
}
