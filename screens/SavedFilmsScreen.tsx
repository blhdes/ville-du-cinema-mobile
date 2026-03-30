import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native'
import { useTabBarInset } from '@/hooks/useTabBarInset'
import type { SavedFilm } from '@/types/database'
import type { ProfileStackParamList } from '@/navigation/types'
import { getUserSavedFilms } from '@/services/savedFilms'
import { posterUrl } from '@/services/tmdb'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import Spinner from '@/components/ui/Spinner'

type Filter = 'all' | 'want' | 'seen'

export default function SavedFilmsScreen() {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>()
  const route = useRoute<RouteProp<ProfileStackParamList, 'SavedFilms'>>()
  const tabBarInset = useTabBarInset()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const { userId } = route.params

  const [films, setFilms] = useState<SavedFilm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      const data = await getUserSavedFilms(userId)
      setFilms(data)
      setIsLoading(false)
    })
    return () => task.cancel()
  }, [userId])

  const filteredFilms = useMemo(() => {
    if (filter === 'all') return films
    return films.filter((f) => f.status === filter)
  }, [films, filter])

  const renderFilm = useCallback(({ item }: { item: SavedFilm }) => {
    const uri = posterUrl(item.poster_path, 'w342')
    const badge = item.status === 'seen' ? 'Seen' : 'Want'

    return (
      <Pressable
        style={({ pressed }) => [styles.filmCard, pressed && styles.pressed]}
        onPress={() => navigation.navigate('FilmCard', {
          tmdbId: item.tmdb_id,
          movieTitle: item.movie_title,
        })}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.poster} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Text style={styles.fallbackText} numberOfLines={2}>{item.movie_title}</Text>
          </View>
        )}
        <View style={[styles.badge, item.status === 'seen' ? styles.badgeSeen : styles.badgeWant]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
        <Text style={styles.filmTitle} numberOfLines={2}>{item.movie_title}</Text>
      </Pressable>
    )
  }, [navigation, styles])

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Spinner size={24} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'want', 'seen'] as const).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'want' ? 'Want to watch' : 'Seen'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredFilms}
        keyExtractor={(item) => `${item.user_id}-${item.tmdb_id}`}
        renderItem={renderFilm}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={{ paddingBottom: tabBarInset + 20, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No saved films yet.' : `No "${filter}" films.`}
            </Text>
          </View>
        }
      />
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
    },
    pressed: {
      opacity: 0.7,
    },

    // Filter tabs
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    filterTab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
    },
    filterTabActive: {
      backgroundColor: colors.teal,
    },
    filterText: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
    },
    filterTextActive: {
      color: colors.background,
      fontWeight: '600',
    },

    // Grid
    gridRow: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    filmCard: {
      flex: 1 / 3,
      maxWidth: '32%',
    },
    poster: {
      width: '100%',
      aspectRatio: 2 / 3,
      borderRadius: 6,
      backgroundColor: colors.backgroundSecondary,
    },
    posterFallback: {
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
    badge: {
      position: 'absolute',
      top: 4,
      left: 4,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    badgeWant: {
      backgroundColor: 'rgba(0,0,0,0.65)',
    },
    badgeSeen: {
      backgroundColor: 'rgba(0,128,128,0.8)',
    },
    badgeText: {
      fontFamily: fonts.system,
      fontSize: 10,
      fontWeight: '600',
      color: '#fff',
    },
    filmTitle: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.foreground,
      marginTop: 4,
    },
    emptyText: {
      fontFamily: fonts.system,
      fontStyle: 'italic',
      fontSize: typography.callout.fontSize,
      color: colors.secondaryText,
      paddingVertical: spacing.xl,
    },
  })
}
