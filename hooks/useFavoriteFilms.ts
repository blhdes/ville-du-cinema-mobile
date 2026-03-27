import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import type { FavoriteFilm } from '@/types/database'
import { getUserFavorites, setFavoriteFilm, removeFavoriteFilm } from '@/services/favoriteFilms'
import { useUser } from '@/hooks/useUser'

export interface UseFavoriteFilmsReturn {
  favorites: FavoriteFilm[]
  isLoading: boolean
  /** Set a film at a given position (1–4). Replaces whatever was there. */
  setFavorite: (position: number, tmdbId: number, movieTitle: string, posterPath: string | null) => Promise<void>
  /** Remove a film from a position. */
  removeFavorite: (position: number) => Promise<void>
  /** Refetch from server. */
  refetch: () => void
}

/**
 * Manages the current user's top-4 favorite films.
 * Optimistic add/remove with rollback on failure.
 */
export function useFavoriteFilms(): UseFavoriteFilmsReturn {
  const { user } = useUser()
  const [favorites, setFavorites] = useState<FavoriteFilm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  const fetchFavorites = useCallback(async () => {
    if (!user) return
    const data = await getUserFavorites(user.id)
    if (isMounted.current) {
      setFavorites(data)
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  const setFavorite = useCallback(async (
    position: number,
    tmdbId: number,
    movieTitle: string,
    posterPath: string | null,
  ) => {
    if (!user) return
    const prev = [...favorites]

    // Optimistic: replace or add at position
    const next = prev.filter((f) => f.position !== position)
    next.push({
      user_id: user.id,
      tmdb_id: tmdbId,
      movie_title: movieTitle,
      poster_path: posterPath,
      position,
    })
    next.sort((a, b) => a.position - b.position)
    setFavorites(next)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      await setFavoriteFilm({
        tmdb_id: tmdbId,
        movie_title: movieTitle,
        poster_path: posterPath,
        position,
      })
    } catch {
      if (isMounted.current) setFavorites(prev)
    }
  }, [user, favorites])

  const removeFavorite = useCallback(async (position: number) => {
    const prev = [...favorites]
    setFavorites(prev.filter((f) => f.position !== position))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      await removeFavoriteFilm(position)
    } catch {
      if (isMounted.current) setFavorites(prev)
    }
  }, [favorites])

  return { favorites, isLoading, setFavorite, removeFavorite, refetch: fetchFavorites }
}
