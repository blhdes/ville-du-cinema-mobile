import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  InteractionManager,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, type RouteProp, useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { TmdbMovieDetail, TmdbCreditPerson, TmdbVideo } from '@/types/tmdb'
import type { Take, Clipping } from '@/types/database'
import { getMovieDetail, posterUrl, backdropUrl, clearTmdbCache } from '@/services/tmdb'
import { getFilmTakes } from '@/services/takes'
import { getFilmClippings } from '@/services/clippings'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import ErrorBanner from '@/components/ui/ErrorBanner'
import FilmCardSkeleton from '@/components/film/FilmCardSkeleton'
import LetterboxdDots from '@/components/ui/LetterboxdDots'
import TakeCard from '@/components/TakeCard'
import ClippingCard from '@/components/profile/ClippingCard'
import { useSavedFilm } from '@/hooks/useSavedFilm'

type FilmCardRoute = RouteProp<FeedStackParamList, 'FilmCard'>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRuntime(minutes: number | null): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatYear(releaseDate: string): string {
  return releaseDate?.slice(0, 4) ?? ''
}

function formatScore(voteAverage: number): string {
  return `${Math.round(voteAverage * 10)}%`
}

function getDirectors(crew: TmdbCreditPerson[]): TmdbCreditPerson[] {
  return crew.filter((p) => p.job === 'Director')
}

function getTrailer(videos: TmdbVideo[]): TmdbVideo | undefined {
  return (
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ??
    videos.find((v) => v.site === 'YouTube')
  )
}

// ---------------------------------------------------------------------------
// FilmCardScreen
// ---------------------------------------------------------------------------

export default function FilmCardScreen() {
  const { params } = useRoute<FilmCardRoute>()
  const { tmdbId, movieTitle } = params
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()

  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const [movie, setMovie] = useState<TmdbMovieDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const [takes, setTakes] = useState<Take[]>([])
  const [clippings, setClippings] = useState<Clipping[]>([])

  const isMounted = useRef(true)
  useEffect(() => () => { isMounted.current = false }, [])

  // Watchlist state
  const saved = useSavedFilm(tmdbId, movieTitle, movie?.poster_path ?? null)

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const [movieData, filmTakes, filmClippings] = await Promise.allSettled([
        getMovieDetail(tmdbId),
        getFilmTakes(tmdbId),
        getFilmClippings(tmdbId),
      ])
      if (!isMounted.current) return
      if (movieData.status === 'fulfilled') setMovie(movieData.value)
      if (filmTakes.status === 'fulfilled') setTakes(filmTakes.value)
      if (filmClippings.status === 'fulfilled') setClippings(filmClippings.value)
    } catch {
      if (isMounted.current) setError('Failed to load film details')
    }
  }, [tmdbId])

  // Defer fetch until push animation finishes
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadData().finally(() => {
        if (isMounted.current) setIsLoading(false)
      })
    })
    return () => task.cancel()
  }, [loadData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    clearTmdbCache()
    await loadData()
    setRefreshing(false)
  }, [loadData])

  // -- Loading state --
  if (isLoading) {
    return <FilmCardSkeleton />
  }

  // -- Error state --
  if (error && !movie) {
    return (
      <View style={styles.container}>
        <ErrorBanner message={error} />
      </View>
    )
  }

  if (!movie) return null

  const directors = getDirectors(movie.credits.crew)
  const topCast = movie.credits.cast.slice(0, 8)
  const trailer = getTrailer(movie.videos.results)
  const year = formatYear(movie.release_date)
  const runtime = formatRuntime(movie.runtime)
  const backdrop = backdropUrl(movie.backdrop_path)
  const poster = posterUrl(movie.poster_path, 'w500')
  const letterboxdSearchUrl = `https://letterboxd.com/search/${encodeURIComponent(movie.title)}/`

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.secondaryText}
        />
      }
    >
      {/* ---- Backdrop ---- */}
      {backdrop ? (
        <View style={styles.backdropWrapper}>
          <Image source={backdrop} style={styles.backdrop} cachePolicy="memory-disk" />
          <View style={styles.backdropGradient} />
        </View>
      ) : null}

      {/* ---- Poster + Title block ---- */}
      <View style={[styles.headerRow, !backdrop && styles.headerRowNoBd]}>
        {poster ? (
          <Image source={poster} style={styles.poster} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Ionicons name="film-outline" size={32} color={colors.secondaryText} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.meta}>
            {[year, runtime, formatScore(movie.vote_average)]
              .filter(Boolean)
              .join(' \u00B7 ')}
          </Text>
          {directors.length > 0 ? (
            <Text style={styles.directors}>
              Directed by {directors.map((d) => d.name).join(', ')}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ---- Genre tags ---- */}
      {movie.genres.length > 0 ? (
        <View style={styles.genreRow}>
          {movie.genres.map((g) => (
            <View key={g.id} style={styles.genreChip}>
              <Text style={styles.genreLabel}>{g.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ---- Synopsis ---- */}
      {movie.overview ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synopsis</Text>
          <Text
            style={styles.synopsis}
            numberOfLines={synopsisExpanded ? undefined : 4}
          >
            {movie.overview}
          </Text>
          {!synopsisExpanded && movie.overview.length > 200 ? (
            <Pressable onPress={() => setSynopsisExpanded(true)}>
              <Text style={styles.readMore}>Read more</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* ---- Cast ---- */}
      {topCast.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cast</Text>
          <View style={styles.castGrid}>
            {topCast.map((person) => (
              <View key={person.id} style={styles.castItem}>
                <Text style={styles.castName} numberOfLines={1}>{person.name}</Text>
                <Text style={styles.castRole} numberOfLines={1}>{person.character}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ---- Trailer ---- */}
      {trailer ? (
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}
            onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`)}
          >
            <Ionicons name="play-circle-outline" size={20} color={colors.teal} />
            <Text style={styles.actionLabel}>Watch Trailer</Text>
          </Pressable>
        </View>
      ) : null}

      {/* ---- Watchlist buttons ---- */}
      <View style={styles.section}>
        <View style={styles.watchlistRow}>
          <Pressable
            style={({ pressed }) => [
              styles.watchlistBtn,
              saved.status === 'want' && styles.watchlistBtnActive,
              pressed && styles.actionPressed,
            ]}
            onPress={() => saved.toggleStatus('want')}
          >
            <Ionicons
              name={saved.status === 'want' ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={saved.status === 'want' ? '#fff' : colors.teal}
            />
            <Text style={[
              styles.watchlistLabel,
              saved.status === 'want' && styles.watchlistLabelActive,
            ]}>
              Want to watch
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.watchlistBtn,
              saved.status === 'seen' && styles.watchlistBtnActive,
              pressed && styles.actionPressed,
            ]}
            onPress={() => saved.toggleStatus('seen')}
          >
            <Ionicons
              name={saved.status === 'seen' ? 'eye' : 'eye-outline'}
              size={16}
              color={saved.status === 'seen' ? '#fff' : colors.teal}
            />
            <Text style={[
              styles.watchlistLabel,
              saved.status === 'seen' && styles.watchlistLabelActive,
            ]}>
              Seen it
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ---- Write a Take ---- */}
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}
          onPress={() => navigation.navigate('CreateTake', {
            tmdbId: movie.id,
            movieTitle: movie.title,
            posterPath: movie.poster_path,
          })}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.teal} />
          <Text style={styles.actionLabel}>Write a Take</Text>
        </Pressable>
      </View>

      {/* ---- Takes about this film ---- */}
      {takes.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Takes</Text>
          {takes.map((take) => (
            <TakeCard key={take.id} take={take} readOnly />
          ))}
        </View>
      ) : null}

      {/* ---- Clippings about this film ---- */}
      {clippings.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clippings</Text>
          {clippings.map((clipping) => (
            <ClippingCard
              key={clipping.id}
              clipping={clipping}
              onDeleted={() => setClippings((prev) => prev.filter((c) => c.id !== clipping.id))}
              readOnly
            />
          ))}
        </View>
      ) : null}

      {/* ---- External links ---- */}
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}
          onPress={() => Linking.openURL(letterboxdSearchUrl)}
        >
          <LetterboxdDots size={16} />
          <Text style={styles.actionLabel}>View on Letterboxd</Text>
        </Pressable>
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const POSTER_WIDTH = 110
const POSTER_ASPECT = 1.5
const HORIZONTAL_PAD = 20

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      paddingBottom: spacing.xxl,
    },

    // ---- Backdrop ----
    backdropWrapper: {
      width: '100%',
      height: 200,
    },
    backdrop: {
      width: '100%',
      height: '100%',
    },
    backdropGradient: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
      opacity: 0.35,
    },

    // ---- Poster + title ----
    headerRow: {
      flexDirection: 'row',
      paddingHorizontal: HORIZONTAL_PAD,
      marginTop: -40, // overlap the backdrop
      gap: spacing.md,
    },
    headerRowNoBd: {
      marginTop: spacing.lg,
    },
    poster: {
      width: POSTER_WIDTH,
      height: POSTER_WIDTH * POSTER_ASPECT,
      borderRadius: 8,
      overflow: 'hidden',
    },
    posterPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      flex: 1,
      paddingTop: 44, // align with poster bottom half
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: typography.title1.fontSize,
      lineHeight: typography.title1.lineHeight,
      color: colors.foreground,
    },
    meta: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      marginTop: spacing.xs,
    },
    directors: {
      fontFamily: fonts.bodyItalic,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.secondaryText,
      marginTop: spacing.xs,
    },

    // ---- Genre tags ----
    genreRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: HORIZONTAL_PAD,
      marginTop: spacing.lg,
    },
    genreChip: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    genreLabel: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
    },

    // ---- Sections ----
    section: {
      paddingHorizontal: HORIZONTAL_PAD,
      marginTop: spacing.lg,
    },
    sectionTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.title3.fontSize,
      lineHeight: typography.title3.lineHeight,
      color: colors.foreground,
      marginBottom: spacing.sm,
    },
    synopsis: {
      fontFamily: fonts.body,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
    },
    readMore: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.caption.fontSize,
      color: colors.teal,
      marginTop: spacing.xs,
    },

    // ---- Cast ----
    castGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    castItem: {
      width: '47%',
    },
    castName: {
      fontFamily: fonts.system,
      fontWeight: '500' as const,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.foreground,
    },
    castRole: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
    },

    // ---- Action rows ----
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    actionPressed: {
      opacity: 0.6,
    },
    actionLabel: {
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.teal,
    },

    // ---- Watchlist ----
    watchlistRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    watchlistBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm + 2,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.teal,
    },
    watchlistBtnActive: {
      backgroundColor: colors.teal,
      borderColor: colors.teal,
    },
    watchlistLabel: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.caption.fontSize,
      color: colors.teal,
    },
    watchlistLabelActive: {
      color: '#fff',
    },

    bottomSpacer: {
      height: spacing.xl,
    },
  })
}
