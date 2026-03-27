import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { DiscoverStackParamList } from '@/navigation/types'
import type { NetworkFilm } from '@/services/takes'
import { posterUrl } from '@/services/tmdb'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'

interface NetworkFilmRowProps {
  film: NetworkFilm
}

function NetworkFilmRow({ film }: NetworkFilmRowProps) {
  const navigation = useNavigation<NavigationProp<DiscoverStackParamList>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const uri = posterUrl(film.posterPath, 'w154')
  const label = film.takeCount === 1 ? '1 take' : `${film.takeCount} takes`

  return (
    <Pressable
      onPress={() => navigation.navigate('FilmCard', { tmdbId: film.tmdbId, movieTitle: film.movieTitle })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.poster} cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.fallbackInitial}>{film.movieTitle.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{film.movieTitle}</Text>
        <Text style={styles.takeCount}>{label}</Text>
      </View>
    </Pressable>
  )
}

export default memo(NetworkFilmRow)

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: spacing.sm + 2,
    },
    pressed: {
      opacity: 0.6,
    },
    poster: {
      width: 44,
      height: 66,
      borderRadius: 4,
      backgroundColor: colors.backgroundSecondary,
    },
    posterFallback: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    fallbackInitial: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: colors.secondaryText,
    },
    info: {
      flex: 1,
      marginLeft: spacing.md,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.foreground,
    },
    takeCount: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
      marginTop: 2,
    },
  })
}
