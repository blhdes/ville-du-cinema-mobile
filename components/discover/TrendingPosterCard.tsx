import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { TmdbSearchResult } from '@/types/tmdb'
import type { DiscoverStackParamList } from '@/navigation/types'
import { posterUrl } from '@/services/tmdb'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'

const CARD_WIDTH = 120
const POSTER_HEIGHT = 180

interface TrendingPosterCardProps {
  movie: TmdbSearchResult
}

function TrendingPosterCard({ movie }: TrendingPosterCardProps) {
  const navigation = useNavigation<NavigationProp<DiscoverStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const uri = posterUrl(movie.poster_path, 'w342')
  const year = movie.release_date?.slice(0, 4) ?? ''

  return (
    <Pressable
      onPress={() => navigation.navigate('FilmCard', { tmdbId: movie.id, movieTitle: movie.title })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.poster} cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.fallbackText} numberOfLines={2}>{movie.title}</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
      {year ? <Text style={styles.year}>{year}</Text> : null}
    </Pressable>
  )
}

export default memo(TrendingPosterCard)

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      marginRight: spacing.md,
    },
    pressed: {
      opacity: 0.7,
    },
    poster: {
      width: CARD_WIDTH,
      height: POSTER_HEIGHT,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
    },
    posterFallback: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.sm,
    },
    fallbackText: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
      textAlign: 'center',
    },
    title: {
      fontFamily: fonts.system,
      fontWeight: '600',
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.foreground,
      marginTop: spacing.xs,
    },
    year: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize - 1,
      color: colors.secondaryText,
      marginTop: 1,
    },
  })
}
