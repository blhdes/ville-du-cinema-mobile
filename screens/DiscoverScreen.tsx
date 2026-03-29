import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  InteractionManager,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTabBarInset } from '@/hooks/useTabBarInset'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { TmdbSearchResult } from '@/types/tmdb'
import type { DiscoverStackParamList } from '@/navigation/types'
import type { NetworkFilm } from '@/services/takes'
import { getTrending, searchMovies, posterUrl, clearTmdbCache } from '@/services/tmdb'
import { getNetworkFilms } from '@/services/takes'
import { useUserLists } from '@/hooks/useUserLists'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import TrendingPosterCard from '@/components/discover/TrendingPosterCard'
import NetworkFilmRow from '@/components/discover/NetworkFilmRow'
import Spinner from '@/components/ui/Spinner'

const HORIZONTAL_PAD = 20
const SEARCH_DEBOUNCE = 350

export default function DiscoverScreen() {
  const navigation = useNavigation<NavigationProp<DiscoverStackParamList>>()
  const insets = useSafeAreaInsets()
  const tabBarInset = useTabBarInset()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const { villageUserIds } = useUserLists()

  // ── State ──
  const [trending, setTrending] = useState<TmdbSearchResult[]>([])
  const [networkFilms, setNetworkFilms] = useState<NetworkFilm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Search
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    const [trendingResult, networkResult] = await Promise.allSettled([
      getTrending('week'),
      getNetworkFilms(villageUserIds),
    ])

    if (trendingResult.status === 'fulfilled') {
      setTrending(trendingResult.value.results.slice(0, 20))
    }
    if (networkResult.status === 'fulfilled') {
      setNetworkFilms(networkResult.value)
    }
  }, [villageUserIds])

  // Deferred initial load
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      await fetchData()
      setIsLoading(false)
    })
    return () => task.cancel()
  }, [fetchData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    clearTmdbCache()
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  // ── Search ──
  const handleSearch = useCallback((text: string) => {
    setQuery(text)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (text.trim().length === 0) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchMovies(text.trim())
        setSearchResults(result.results.slice(0, 15))
      } catch (error) {
        console.error('Discover search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, SEARCH_DEBOUNCE)
  }, [])

  const handleSearchResultPress = useCallback((movie: TmdbSearchResult) => {
    navigation.navigate('FilmCard', { tmdbId: movie.id, movieTitle: movie.title })
  }, [navigation])

  // ── Render helpers ──
  const isSearchMode = query.trim().length > 0

  const renderSearchResult = useCallback(({ item }: { item: TmdbSearchResult }) => {
    const year = item.release_date?.slice(0, 4) ?? ''
    const poster = posterUrl(item.poster_path, 'w154')
    return (
      <Pressable
        onPress={() => handleSearchResultPress(item)}
        style={({ pressed }) => [styles.searchRow, pressed && styles.pressed]}
      >
        {poster ? (
          <Image source={poster} style={styles.searchPoster} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.searchPoster, styles.searchPosterPlaceholder]}>
            <Ionicons name="film-outline" size={14} color={colors.secondaryText} />
          </View>
        )}
        <View style={styles.searchInfo}>
          <Text style={styles.searchTitle} numberOfLines={1}>{item.title}</Text>
          {year ? <Text style={styles.searchYear}>{year}</Text> : null}
        </View>
      </Pressable>
    )
  }, [handleSearchResultPress, colors, styles])

  // ── Main content (non-search mode) ──
  const mainContent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Spinner size={24} />
        </View>
      )
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarInset + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondaryText}
          />
        }
      >
        {/* Trending this week */}
        <Text style={styles.sectionTitle}>Trending This Week</Text>
        {trending.length > 0 ? (
          <FlatList
            data={trending}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <TrendingPosterCard movie={item} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
          />
        ) : (
          <Text style={styles.emptyText}>No trending data available.</Text>
        )}

        {/* In your network */}
        {villageUserIds.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>In Your Network</Text>
            {networkFilms.length > 0 ? (
              networkFilms.map((film) => (
                <NetworkFilmRow key={film.tmdbId} film={film} />
              ))
            ) : (
              <Text style={styles.emptyText}>No takes from your network yet.</Text>
            )}
          </>
        )}

        {/* Search users */}
        <Pressable
          onPress={() => navigation.navigate('UserSearch')}
          style={({ pressed }) => [styles.findPeopleRow, pressed && styles.pressed]}
        >
          <Ionicons name="people-outline" size={20} color={colors.teal} />
          <Text style={styles.findPeopleText}>Find people to follow</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
        </Pressable>
      </ScrollView>
    )
  }, [isLoading, trending, networkFilms, villageUserIds, refreshing, handleRefresh, navigation, insets, colors, styles])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search films..."
          placeholderTextColor={colors.secondaryText}
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => handleSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </Pressable>
        )}
      </View>

      {/* Content: search results or main browse */}
      {isSearchMode ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSearchResult}
          contentContainerStyle={{ paddingBottom: tabBarInset + 20 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isSearching ? (
              <View style={styles.searchingIndicator}>
                <Spinner size={16} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isSearching ? (
              <Text style={styles.emptyText}>No results for "{query}"</Text>
            ) : null
          }
        />
      ) : (
        mainContent
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pressed: {
      opacity: 0.6,
    },

    // Search bar
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: HORIZONTAL_PAD,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.foreground,
      padding: 0,
    },

    // Sections
    sectionTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.title3.fontSize,
      lineHeight: typography.title3.lineHeight,
      color: colors.foreground,
      paddingHorizontal: HORIZONTAL_PAD,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    carouselContent: {
      paddingHorizontal: HORIZONTAL_PAD,
    },
    emptyText: {
      fontFamily: fonts.system,
      fontStyle: 'italic',
      fontSize: typography.callout.fontSize,
      color: colors.secondaryText,
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.md,
    },

    // Find people
    findPeopleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: HORIZONTAL_PAD,
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    findPeopleText: {
      flex: 1,
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.teal,
    },

    // Search results
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.sm + 4,
      gap: spacing.md,
    },
    searchPoster: {
      width: 36,
      height: 54,
      borderRadius: 4,
    },
    searchPosterPlaceholder: {
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchInfo: {
      flex: 1,
    },
    searchTitle: {
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.foreground,
    },
    searchYear: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
      marginTop: 1,
    },
    searchingIndicator: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
  })
}
