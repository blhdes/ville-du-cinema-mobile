import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { FeedStackParamList } from '@/navigation/types'
import type { TmdbSearchResult } from '@/types/tmdb'
import { searchMovies, posterUrl } from '@/services/tmdb'
import { createTake } from '@/services/takes'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import Spinner from '@/components/ui/Spinner'

type CreateTakeRoute = RouteProp<FeedStackParamList, 'CreateTake'>

const MAX_LENGTH = 280

export default function CreateTakeScreen() {
  const { bottom: safeBottom } = useSafeAreaInsets()
  const navigation = useNavigation()
  const route = useRoute<CreateTakeRoute>()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  // Pre-filled film from route params (e.g. from FilmCard "Write a Take" button)
  const prefilled = route.params

  const [selectedFilm, setSelectedFilm] = useState<{
    tmdbId: number
    movieTitle: string
    posterPath: string | null
  } | null>(
    prefilled?.tmdbId && prefilled?.movieTitle
      ? { tmdbId: prefilled.tmdbId, movieTitle: prefilled.movieTitle, posterPath: prefilled.posterPath ?? null }
      : null,
  )

  const [content, setContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)

  // Film search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const contentInputRef = useRef<TextInput>(null)

  const remaining = MAX_LENGTH - content.length
  const isPostDisabled = isPosting || !selectedFilm || content.trim().length === 0

  // Header buttons: Cancel / Post
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.headerCancel}>Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => handlePostRef.current()}
          disabled={isPostDisabled}
          hitSlop={8}
        >
          <Text style={[styles.headerPost, isPostDisabled && styles.headerPostDisabled]}>
            Post
          </Text>
        </Pressable>
      ),
    })
  }, [navigation, isPostDisabled, styles])

  // Debounced film search
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await searchMovies(trimmed)
        setSearchResults(res.results.slice(0, 8))
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectFilm = useCallback((film: TmdbSearchResult) => {
    setSelectedFilm({
      tmdbId: film.id,
      movieTitle: film.title,
      posterPath: film.poster_path,
    })
    setSearchQuery('')
    setSearchResults([])
    // Focus the text input after selecting a film
    setTimeout(() => contentInputRef.current?.focus(), 100)
  }, [])

  const handleClearFilm = useCallback(() => {
    setSelectedFilm(null)
  }, [])

  const handlePost = useCallback(async () => {
    if (isPostDisabled || !selectedFilm) return
    setIsPosting(true)

    try {
      await createTake({
        tmdb_id: selectedFilm.tmdbId,
        movie_title: selectedFilm.movieTitle,
        poster_path: selectedFilm.posterPath,
        content: content.trim(),
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      navigation.goBack()
    } catch (error) {
      console.error('Failed to post take:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setIsPosting(false)
    }
  }, [isPostDisabled, selectedFilm, content, navigation])

  // Ref always points to the latest handlePost — avoids stale closure in the header button.
  const handlePostRef = useRef(handlePost)
  handlePostRef.current = handlePost

  const renderSearchResult = useCallback(({ item }: { item: TmdbSearchResult }) => {
    const poster = posterUrl(item.poster_path, 'w154')
    const year = item.release_date?.slice(0, 4) ?? ''
    return (
      <Pressable
        style={({ pressed }) => [styles.searchRow, pressed && styles.searchRowPressed]}
        onPress={() => handleSelectFilm(item)}
      >
        {poster ? (
          <Image source={poster} style={styles.searchPoster} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.searchPoster, styles.searchPosterPlaceholder]}>
            <Ionicons name="film-outline" size={14} color={colors.secondaryText} />
          </View>
        )}
        <View style={styles.searchTextCol}>
          <Text style={styles.searchTitle} numberOfLines={1}>{item.title}</Text>
          {year ? <Text style={styles.searchYear}>{year}</Text> : null}
        </View>
      </Pressable>
    )
  }, [handleSelectFilm, styles, colors])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.inner, { paddingBottom: safeBottom + spacing.md }]}>
        {/* Film selector */}
        {selectedFilm ? (
          <View style={styles.selectedFilm}>
            {selectedFilm.posterPath ? (
              <Image
                source={posterUrl(selectedFilm.posterPath, 'w154')}
                style={styles.selectedPoster}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.selectedPoster, styles.searchPosterPlaceholder]}>
                <Ionicons name="film-outline" size={16} color={colors.secondaryText} />
              </View>
            )}
            <Text style={styles.selectedTitle} numberOfLines={1}>{selectedFilm.movieTitle}</Text>
            <Pressable onPress={handleClearFilm} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={colors.secondaryText} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a film..."
                placeholderTextColor={colors.secondaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {isSearching && <Spinner size={14} />}
            </View>
            {searchResults.length > 0 && (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderSearchResult}
                keyboardShouldPersistTaps="handled"
                style={styles.searchList}
              />
            )}
          </View>
        )}

        {/* Content input — only visible after selecting a film */}
        {selectedFilm && (
          <View style={styles.contentSection}>
            <TextInput
              ref={contentInputRef}
              style={styles.contentInput}
              placeholder="What's your take?"
              placeholderTextColor={colors.secondaryText}
              value={content}
              onChangeText={setContent}
              maxLength={MAX_LENGTH}
              multiline
              textAlignVertical="top"
              autoFocus={!!prefilled?.tmdbId}
            />
            <Text style={[styles.charCount, remaining < 20 && styles.charCountWarn, remaining < 0 && styles.charCountError]}>
              {remaining}
            </Text>
          </View>
        )}

        {isPosting && (
          <View style={styles.postingOverlay}>
            <Spinner size={20} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
    inner: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: spacing.md,
    },

    // Header buttons
    headerCancel: {
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      color: colors.secondaryText,
    },
    headerPost: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.callout.fontSize,
      color: colors.teal,
    },
    headerPostDisabled: {
      opacity: 0.4,
    },

    // Selected film chip
    selectedFilm: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      padding: spacing.sm,
      marginBottom: spacing.md,
    },
    selectedPoster: {
      width: 32,
      height: 48,
      borderRadius: 4,
    },
    selectedTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.foreground,
      flex: 1,
    },

    // Film search
    searchSection: {
      flex: 1,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.foreground,
      padding: 0,
    },
    searchList: {
      marginTop: spacing.sm,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    searchRowPressed: {
      opacity: 0.6,
    },
    searchPoster: {
      width: 28,
      height: 42,
      borderRadius: 3,
    },
    searchPosterPlaceholder: {
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchTextCol: {
      flex: 1,
    },
    searchTitle: {
      fontFamily: fonts.system,
      fontWeight: '500' as const,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
    },
    searchYear: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
    },

    // Content input
    contentSection: {
      flex: 1,
    },
    contentInput: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
      paddingTop: 0,
    },
    charCount: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
      textAlign: 'right',
      paddingTop: spacing.xs,
    },
    charCountWarn: {
      color: colors.yellow,
    },
    charCountError: {
      color: colors.red,
    },

    // Posting overlay
    postingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
      opacity: 0.7,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })
}
