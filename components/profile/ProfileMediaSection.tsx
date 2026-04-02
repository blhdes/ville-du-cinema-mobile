import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { FavoriteFilm } from '@/types/database'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import FavoriteFilmsGrid from '@/components/profile/FavoriteFilmsGrid'

interface ProfileMediaSectionProps {
  favorites: FavoriteFilm[]
  editable?: boolean
  onEditSlot?: (position: number) => void
  savedFilmsCount: number
  onWatchlistPress?: () => void
}

export default function ProfileMediaSection({
  favorites,
  editable,
  onEditSlot,
  savedFilmsCount,
  onWatchlistPress,
}: ProfileMediaSectionProps) {
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  return (
    <View style={savedFilmsCount > 0 && onWatchlistPress ? undefined : styles.container}>
      {/* Top-4 favorite films */}
      <FavoriteFilmsGrid
        favorites={favorites}
        editable={editable}
        onEditSlot={onEditSlot}
      />

      {/* Watchlist link */}
      {savedFilmsCount > 0 && onWatchlistPress && (
        <Pressable
          style={({ pressed }) => [styles.watchlistLink, pressed && styles.pressed]}
          onPress={onWatchlistPress}
        >
          <Ionicons name="bookmark-outline" size={16} color={colors.teal} />
          <Text style={styles.watchlistLinkText}>
            Watchlist ({savedFilmsCount})
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
        </Pressable>
      )}
    </View>
  )
}

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      paddingBottom: spacing.lg,
    },
    watchlistLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: 20,
      paddingVertical: spacing.md,
    },
    watchlistLinkText: {
      flex: 1,
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      color: colors.teal,
    },
    pressed: {
      opacity: 0.6,
    },
  })
}
