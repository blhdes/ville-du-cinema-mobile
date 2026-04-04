import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  InteractionManager,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, type RouteProp, useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { TmdbMovieDetail, TmdbCreditPerson, TmdbVideo } from '@/types/tmdb'
import type { Take, Clipping } from '@/types/database'
import * as WebBrowser from 'expo-web-browser'
import { getMovieDetail, posterUrl, backdropUrl } from '@/services/tmdb'
import { getFilmTakes } from '@/services/takes'
import { getFilmClippings } from '@/services/clippings'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import ErrorBanner from '@/components/ui/ErrorBanner'
import FilmCardSkeleton from '@/components/film/FilmCardSkeleton'
import ImdbBadge from '@/components/ui/ImdbBadge'
import LetterboxdDots from '@/components/ui/LetterboxdDots'
import TakeCard from '@/components/TakeCard'
import ClippingCard from '@/components/profile/ClippingCard'
import LogoIcon from '@/components/ui/LogoIcon'
import { useSavedFilm } from '@/hooks/useSavedFilm'
import { useTabBarInset } from '@/hooks/useTabBarInset'

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
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const [takes, setTakes] = useState<Take[]>([])
  const [clippings, setClippings] = useState<Clipping[]>([])
  const [reactionsExpanded, setReactionsExpanded] = useState(false)
  const [posterOpen, setPosterOpen] = useState(false)
  const { width } = useWindowDimensions()

  const isMounted = useRef(true)
  useEffect(() => () => { isMounted.current = false }, [])

  const movieRef = useRef(movie)
  movieRef.current = movie

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            const m = movieRef.current
            navigation.navigate('CreateTake', {
              tmdbId,
              movieTitle,
              posterPath: m?.poster_path ?? null,
            })
          }}
          hitSlop={8}
          style={{ marginRight: 4 }}
        >
          <Ionicons name="create-outline" size={22} color={colors.teal} />
        </Pressable>
      ),
    })
  }, [navigation, tmdbId, movieTitle, colors.teal])

  // Watchlist state
  const tabBarInset = useTabBarInset()
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
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + spacing.lg }]}
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
          <Pressable onPress={() => setPosterOpen(true)}>
            <Image source={poster} style={styles.poster} cachePolicy="memory-disk" />
          </Pressable>
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Ionicons name="film-outline" size={32} color={colors.secondaryText} />
          </View>
        )}
        <View style={styles.headerText}>
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(
              `https://www.google.com/search?q=${encodeURIComponent(movie.title + ' film')}`
            )}
            style={({ pressed }) => pressed && styles.actionPressed}
          >
            <Text style={styles.title}>{movie.title}</Text>
          </Pressable>
          <Text style={styles.meta}>
            {[year, runtime, formatScore(movie.vote_average)]
              .filter(Boolean)
              .join(' \u00B7 ')}
          </Text>
          {directors.length > 0 ? (
            <Text style={styles.directors}>
              {'Directed by '}
              {directors.map((d, i) => (
                <Text key={d.id}>
                  <Text
                    style={styles.directorLink}
                    onPress={() => WebBrowser.openBrowserAsync(
                      `https://www.google.com/search?q=${encodeURIComponent(d.name + ' director')}`
                    )}
                  >
                    {d.name}
                  </Text>
                  {i < directors.length - 1 ? ', ' : ''}
                </Text>
              ))}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ---- Genre tags + external badges ---- */}
      <View style={styles.metaRow}>
        {movie.genres.length > 0 ? (
          <View style={styles.genreRow}>
            {movie.genres.map((g, i) => (
              <Text key={g.id} style={styles.genreLabel}>
                {g.name}{i < movie.genres.length - 1 ? '  ·  ' : ''}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={styles.badgeRow}>
          {movie.imdb_id ? (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(`https://www.imdb.com/title/${movie.imdb_id}/`)}
              style={({ pressed }) => pressed && styles.actionPressed}
              hitSlop={8}
            >
              <ImdbBadge size={28} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(letterboxdSearchUrl)}
            style={({ pressed }) => pressed && styles.actionPressed}
            hitSlop={8}
          >
            <LetterboxdDots size={22} />
          </Pressable>
        </View>
      </View>

      {/* ---- Synopsis ---- */}
      {movie.overview ? (
        <Pressable
          style={styles.section}
          onPress={() => !synopsisExpanded && movie.overview.length > 200 && setSynopsisExpanded(true)}
        >
          <Text style={styles.sectionTitle}>Synopsis</Text>
          <Text
            style={styles.synopsis}
            numberOfLines={synopsisExpanded ? undefined : 4}
          >
            {movie.overview}
          </Text>
          {!synopsisExpanded && movie.overview.length > 200 ? (
            <Text style={styles.readMore}>Read more</Text>
          ) : null}
        </Pressable>
      ) : null}

      {/* ---- Cast ---- */}
      {topCast.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cast</Text>
          <View style={styles.castGrid}>
            {topCast.map((person) => (
              <Pressable
                key={person.id}
                style={({ pressed }) => [styles.castItem, pressed && styles.actionPressed]}
                onPress={() => WebBrowser.openBrowserAsync(
                  `https://www.google.com/search?q=${encodeURIComponent(person.name + ' actor')}`
                )}
              >
                <Text style={styles.castName} numberOfLines={1}>{person.name}</Text>
                <Text style={styles.castRole} numberOfLines={1}>{person.character}</Text>
              </Pressable>
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
              size={15}
              color={saved.status === 'want' ? colors.background : colors.secondaryText}
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
              size={15}
              color={saved.status === 'seen' ? colors.background : colors.secondaryText}
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

      {/* ---- Village Reactions (takes + clippings, merged chronologically) ---- */}
      {(() => {
        const reactions: ({ kind: 'take'; item: Take } | { kind: 'clipping'; item: Clipping })[] = [
          ...takes.map((item) => ({ kind: 'take' as const, item })),
          ...clippings.map((item) => ({ kind: 'clipping' as const, item })),
        ].sort((a, b) => new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime())

        if (reactions.length === 0) return null

        const visible = reactions.slice(0, reactionsExpanded ? 15 : 3)
        const total = reactions.length

        return (
          <View style={styles.villageSection}>
            <View style={styles.villageTitleRow}>
              <LogoIcon size={22} fill={colors.foreground} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>From the Village</Text>
            </View>
            {visible.map((r) =>
              r.kind === 'take' ? (
                <TakeCard key={r.item.id} take={r.item} readOnly />
              ) : (
                <ClippingCard
                  key={r.item.id}
                  clipping={r.item}
                  readOnly
                />
              )
            )}
            {!reactionsExpanded && total > 3 ? (
              <Pressable
                onPress={() => setReactionsExpanded(true)}
                style={({ pressed }) => [styles.showMoreRow, pressed && styles.actionPressed]}
              >
                <Text style={styles.showMoreLabel}>Show more</Text>
              </Pressable>
            ) : null}
            {reactionsExpanded && total > 15 ? (
              <Text style={styles.cappedLabel}>Showing 15 of {total}</Text>
            ) : null}
          </View>
        )
      })()}


    </ScrollView>

    {poster ? (
      <Modal
        visible={posterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPosterOpen(false)}
      >
        <Pressable style={styles.posterOverlay} onPress={() => setPosterOpen(false)}>
          <Image
            source={posterUrl(movie.poster_path, 'w500')}
            style={{ width: width * 0.75, height: width * 0.75 * 1.5, borderRadius: 10 }}
            cachePolicy="memory-disk"
          />
        </Pressable>
      </Modal>
    ) : null}
    </>
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
    content: {},

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
      fontFamily: fonts.body,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.secondaryText,
    },
    directorLink: {
      fontFamily: fonts.body,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.teal,
      marginTop: spacing.xs,
    },

    // ---- Genre tags + badges ----
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: HORIZONTAL_PAD,
      marginTop: spacing.md,
      gap: spacing.md,
    },
    genreRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      flex: 1,
    },
    genreLabel: {
      fontFamily: fonts.system,
      fontWeight: '700' as const,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
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
    villageSection: {
      marginTop: spacing.lg,
    },
    villageTitleRow: {
      paddingHorizontal: HORIZONTAL_PAD,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    synopsis: {
      fontFamily: fonts.body,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
    },
    showMoreRow: {
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.sm,
    },
    showMoreLabel: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.callout.fontSize,
      color: colors.teal,
    },
    posterOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.88)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cappedLabel: {
      paddingHorizontal: HORIZONTAL_PAD,
      fontFamily: fonts.system,
      fontStyle: 'italic' as const,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
      marginTop: spacing.xs,
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
      gap: 6,
      paddingVertical: spacing.sm + 4,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
    },
    watchlistBtnActive: {
      backgroundColor: colors.foreground,
    },
    watchlistLabel: {
      fontFamily: fonts.body,
      fontSize: typography.callout.fontSize,
      color: colors.secondaryText,
    },
    watchlistLabelActive: {
      color: colors.background,
    },

  })
}
