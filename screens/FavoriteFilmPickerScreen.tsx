import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import type { TmdbSearchResult } from '@/types/tmdb'
import type { ProfileStackParamList } from '@/navigation/types'
import { searchMovies, posterUrl } from '@/services/tmdb'
import { useFavoriteFilms } from '@/hooks/useFavoriteFilms'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import Spinner from '@/components/ui/Spinner'

const SEARCH_DEBOUNCE = 350

export default function FavoriteFilmPickerScreen() {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>()
  const route = useRoute<RouteProp<ProfileStackParamList, 'FavoriteFilmPicker'>>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const { setFavorite, removeFavorite, favorites } = useFavoriteFilms()
  const { position } = route.params

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Current film in this slot (if any)
  const current = favorites.find((f) => f.position === position)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: `Favorite #${position}`,
      headerRight: () =>
        current ? (
          <Pressable
            onPress={async () => {
              await removeFavorite(position)
              navigation.goBack()
            }}
            hitSlop={8}
          >
            <Text style={{ fontFamily: fonts.system, fontSize: typography.body.fontSize, color: colors.red }}>
              Remove
            </Text>
          </Pressable>
        ) : null,
    })
  }, [navigation, position, current, colors, typography, removeFavorite])

  const handleSearch = useCallback((text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (text.trim().length === 0) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchMovies(text.trim())
        setResults(res.results.slice(0, 20))
      } catch (error) {
        console.error('FavoriteFilmPicker search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, SEARCH_DEBOUNCE)
  }, [])

  const handleSelect = useCallback(async (movie: TmdbSearchResult) => {
    await setFavorite(position, movie.id, movie.title, movie.poster_path)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    navigation.goBack()
  }, [position, setFavorite, navigation])

  const renderResult = useCallback(({ item }: { item: TmdbSearchResult }) => {
    const uri = posterUrl(item.poster_path, 'w154')
    const year = item.release_date?.slice(0, 4) ?? ''

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={() => handleSelect(item)}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name="film-outline" size={16} color={colors.secondaryText} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
          {year ? <Text style={styles.year}>{year}</Text> : null}
        </View>
      </Pressable>
    )
  }, [handleSelect, colors, styles])

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a film..."
          placeholderTextColor={colors.secondaryText}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      {isSearching ? (
        <View style={styles.center}>
          <Spinner size={16} />
        </View>
      ) : query.trim().length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search" size={40} color={colors.border} />
          <Text style={styles.hintText}>
            Search TMDB to pick your #{position} favorite film.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderResult}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No results for "{query}"</Text>
          }
        />
      )}
    </View>
  )
}

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      gap: spacing.md,
    },
    pressed: {
      opacity: 0.6,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
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
    hintText: {
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      color: colors.secondaryText,
      textAlign: 'center',
    },
    emptyText: {
      fontFamily: fonts.system,
      fontStyle: 'italic',
      fontSize: typography.callout.fontSize,
      color: colors.secondaryText,
      paddingHorizontal: 20,
      paddingVertical: spacing.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: spacing.sm + 2,
      gap: spacing.md,
    },
    thumb: {
      width: 40,
      height: 60,
      borderRadius: 4,
      backgroundColor: colors.backgroundSecondary,
    },
    thumbFallback: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      flex: 1,
    },
    movieTitle: {
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.foreground,
    },
    year: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
      marginTop: 1,
    },
  })
}
