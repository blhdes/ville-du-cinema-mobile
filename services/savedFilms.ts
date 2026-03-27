/**
 * Saved Films Service
 * Watchlist operations: "want to watch" / "seen it" per film per user.
 */

import { supabase } from '@/lib/supabase/client'
import type { SavedFilm } from '@/types/database'

type SaveStatus = 'want' | 'seen'

export interface SaveFilmPayload {
  tmdb_id: number
  movie_title: string
  poster_path: string | null
  status: SaveStatus
}

/**
 * Saves a film (or updates its status) for the authenticated user.
 * Uses upsert — calling this twice with a different status just flips it.
 */
export async function saveFilm(payload: SaveFilmPayload): Promise<SavedFilm> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to save a film.')

  const { data, error } = await supabase
    .from('saved_films')
    .upsert(
      {
        user_id: user.id,
        tmdb_id: payload.tmdb_id,
        movie_title: payload.movie_title,
        poster_path: payload.poster_path,
        status: payload.status,
      },
      { onConflict: 'user_id,tmdb_id' },
    )
    .select()
    .single()

  if (error) {
    console.error('saveFilm error:', error.message)
    throw new Error(`Failed to save film: ${error.message}`)
  }

  return data as SavedFilm
}

/**
 * Removes a film from the user's watchlist entirely.
 */
export async function unsaveFilm(tmdbId: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const { error } = await supabase
    .from('saved_films')
    .delete()
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdbId)

  if (error) {
    console.error('unsaveFilm error:', error.message)
    throw new Error(`Failed to unsave film: ${error.message}`)
  }
}

/**
 * Returns the save status of a single film for the current user.
 * Returns null if the film is not saved.
 */
export async function getFilmSaveStatus(tmdbId: number): Promise<SavedFilm | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('saved_films')
    .select('*')
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdbId)
    .maybeSingle()

  if (error) {
    console.error('getFilmSaveStatus error:', error.message)
    return null
  }

  return data as SavedFilm | null
}

/**
 * Fetches all saved films for a given user, newest first.
 * Optionally filtered by status ('want' or 'seen').
 */
export async function getUserSavedFilms(
  userId: string,
  statusFilter?: SaveStatus,
): Promise<SavedFilm[]> {
  let query = supabase
    .from('saved_films')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('getUserSavedFilms error:', error.message)
    return []
  }

  return (data ?? []) as SavedFilm[]
}
