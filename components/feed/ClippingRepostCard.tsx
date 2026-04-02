import { memo, useMemo, useCallback } from 'react'
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Clipping } from '@/types/database'
import { deleteClipping, saveRepostClipping } from '@/services/clippings'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import ClippingCard from '@/components/profile/ClippingCard'
import SwipeableRow from '@/components/ui/SwipeableRow'

interface ClippingRepostCardProps {
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

function ClippingRepostCard({ clipping, owner, onDeleted }: ClippingRepostCardProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const originalClipping = clipping.review_json as Clipping

  const handleOwnerPress = useCallback(() => {
    if (owner.userId) {
      navigation.navigate('NativeProfile', { userId: owner.userId, username: owner.username })
    }
  }, [navigation, owner.userId, owner.username])

  const handleRepost = useCallback(async () => {
    try {
      await saveRepostClipping(originalClipping)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost clipping:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [originalClipping])

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onDeleted?.(clipping.id)
    deleteClipping(clipping.id).catch((error) => {
      console.error('Failed to delete clipping repost:', error)
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
        <Text style={styles.repostLabel} numberOfLines={1}>
          Reposted by {owner.displayName}
        </Text>
      </Pressable>

      {/* Embedded ClippingCard — repostable=false prevents nested re-reposting */}
      <ClippingCard
        clipping={originalClipping}
        readOnly
        repostable={false}
      />
    </View>
  )

  // Others' clipping reposts: swipe-to-repost
  if (!onDeleted) {
    return (
      <SwipeableRow
        onAction={handleRepost}
        actionColor={colors.teal}
        actionIcon="repeat-outline"
        actionLabel="Repost this clipping"
      >
        {cardContent}
      </SwipeableRow>
    )
  }

  // Own clipping repost: swipe-to-delete
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

export default memo(ClippingRepostCard)

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
