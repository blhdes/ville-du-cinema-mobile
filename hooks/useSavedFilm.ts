import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { getFilmSaveStatus, saveFilm, unsaveFilm } from '@/services/savedFilms'

type SaveStatus = 'want' | 'seen' | null

export interface UseSavedFilmReturn {
  status: SaveStatus
  isLoading: boolean
  /** Sets the film to "want to watch" or "seen it". If already that status, unsaves it. */
  toggleStatus: (target: 'want' | 'seen') => void
}

/**
 * Manages watchlist state for a single film with optimistic updates + haptic feedback.
 * Film metadata is passed in so the service can denormalize title/poster into the row.
 */
export function useSavedFilm(
  tmdbId: number,
  movieTitle: string,
  posterPath: string | null,
): UseSavedFilmReturn {
  const [status, setStatus] = useState<SaveStatus>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  // Hydrate on mount
  useEffect(() => {
    let cancelled = false

    getFilmSaveStatus(tmdbId)
      .then((saved) => {
        if (!cancelled && isMounted.current) {
          setStatus(saved?.status ?? null)
        }
      })
      .finally(() => {
        if (!cancelled && isMounted.current) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [tmdbId])

  const toggleStatus = useCallback((target: 'want' | 'seen') => {
    const prev = status

    // If tapping the same status, unsave
    if (prev === target) {
      setStatus(null)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      unsaveFilm(tmdbId).catch(() => {
        if (isMounted.current) setStatus(prev)
      })
    } else {
      setStatus(target)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      saveFilm({
        tmdb_id: tmdbId,
        movie_title: movieTitle,
        poster_path: posterPath,
        status: target,
      }).catch(() => {
        if (isMounted.current) setStatus(prev)
      })
    }
  }, [tmdbId, movieTitle, posterPath, status])

  return { status, isLoading, toggleStatus }
}
