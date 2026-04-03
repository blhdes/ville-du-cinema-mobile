import { memo, useMemo, useCallback } from 'react'
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Clipping, Take, TakeRepostJson, RepostAuthor } from '@/types/database'
import { deleteClipping, saveRepostTake } from '@/services/clippings'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import TakeCard from '@/components/TakeCard'
import SwipeableRow from '@/components/ui/SwipeableRow'

interface TakeRepostCardProps {
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

function TakeRepostCard({ clipping, owner, onDeleted }: TakeRepostCardProps) {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  // Support both new format { take, author } and legacy bare Take stored before the metadata fix
  const json = clipping.review_json as TakeRepostJson | Take | null
  const take: Take = (json && 'take' in json) ? (json as TakeRepostJson).take : (json as Take)
  const author: RepostAuthor = (json && 'author' in json) ? (json as TakeRepostJson).author : { displayName: clipping.author_name }

  const handleOwnerPress = useCallback(() => {
    if (owner.userId) {
      navigation.navigate('NativeProfile', { userId: owner.userId, username: owner.username })
    }
  }, [navigation, owner.userId, owner.username])

  const handleRepost = useCallback(async () => {
    try {
      await saveRepostTake(take, author)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Failed to repost take:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [take, author])

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onDeleted?.(clipping.id)
    deleteClipping(clipping.id).catch((error) => {
      console.error('Failed to delete take repost:', error)
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

      {/* Embedded TakeCard — repostable=false disables action but still shows count */}
      <TakeCard
        take={take}
        author={author}
        repostable={false}
        readOnly
      />
    </View>
  )

  // Others' take reposts: swipe-to-repost
  if (!onDeleted) {
    return (
      <SwipeableRow
        onAction={handleRepost}
        actionColor={colors.teal}
        actionIcon="repeat-outline"
        actionLabel="Repost this take"
      >
        {cardContent}
      </SwipeableRow>
    )
  }

  // Own take repost: swipe-to-delete
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

export default memo(TakeRepostCard)

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
