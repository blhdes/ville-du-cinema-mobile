import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FavoriteFilm } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { posterUrl } from '@/services/tmdb'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'

const GRID_GAP = 8
const POSTER_ASPECT = 1.5 // height = width * 1.5

interface FavoriteFilmsGridProps {
  favorites: FavoriteFilm[]
  /** When true, shows "+" placeholders for empty slots (own profile). */
  editable?: boolean
  /** Called when the user taps an empty slot or the edit icon. */
  onEditSlot?: (position: number) => void
}

function FavoriteFilmsGrid({ favorites, editable, onEditSlot }: FavoriteFilmsGridProps) {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  // Build a 4-slot array (positions 1–4)
  const slots = useMemo(() => {
    const map = new Map(favorites.map((f) => [f.position, f]))
    return [1, 2, 3, 4].map((pos) => map.get(pos) ?? null)
  }, [favorites])

  // Don't render anything if no favorites and not editable
  if (!editable && favorites.length === 0) return null

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {slots.map((film, idx) => {
          const position = idx + 1
          if (film) {
            const uri = posterUrl(film.poster_path, 'w342')
            return (
              <Pressable
                key={position}
                style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
                onPress={() => navigation.navigate('FilmCard', {
                  tmdbId: film.tmdb_id,
                  movieTitle: film.movie_title,
                })}
                onLongPress={editable ? () => onEditSlot?.(position) : undefined}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.poster} cachePolicy="memory-disk" />
                ) : (
                  <View style={[styles.poster, styles.fallback]}>
                    <Text style={styles.fallbackText} numberOfLines={2}>
                      {film.movie_title}
                    </Text>
                  </View>
                )}
              </Pressable>
            )
          }

          // Empty slot
          if (!editable) return <View key={position} style={styles.slot} />

          return (
            <Pressable
              key={position}
              style={({ pressed }) => [styles.slot, styles.emptySlot, pressed && styles.pressed]}
              onPress={() => onEditSlot?.(position)}
            >
              <Ionicons name="add" size={24} color={colors.border} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export default memo(FavoriteFilmsGrid)

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 20,
    },
    grid: {
      flexDirection: 'row',
      gap: GRID_GAP,
    },
    slot: {
      flex: 1,
      aspectRatio: 1 / POSTER_ASPECT,
      borderRadius: 6,
      overflow: 'hidden',
    },
    pressed: {
      opacity: 0.7,
    },
    poster: {
      width: '100%',
      height: '100%',
      borderRadius: 6,
    },
    fallback: {
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xs,
    },
    fallbackText: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize - 1,
      color: colors.secondaryText,
      textAlign: 'center',
    },
    emptySlot: {
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
  })
}
