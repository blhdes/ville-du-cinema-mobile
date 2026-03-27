/**
 * Favorite Films Service
 * Manages the user's top-4 films pinned on their profile.
 */

import { supabase } from '@/lib/supabase/client'
import type { FavoriteFilm } from '@/types/database'

export interface SetFavoritePayload {
  tmdb_id: number
  movie_title: string
  poster_path: string | null
  position: number // 1–4
}

/**
 * Sets (or replaces) a favorite film at a given position.
 * Uses upsert on (user_id, position) — swapping a slot is a single call.
 */
export async function setFavoriteFilm(payload: SetFavoritePayload): Promise<FavoriteFilm> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const { data, error } = await supabase
    .from('favorite_films')
    .upsert(
      {
        user_id: user.id,
        tmdb_id: payload.tmdb_id,
        movie_title: payload.movie_title,
        poster_path: payload.poster_path,
        position: payload.position,
      },
      { onConflict: 'user_id,position' },
    )
    .select()
    .single()

  if (error) {
    console.error('setFavoriteFilm error:', error.message)
    throw new Error(`Failed to set favorite: ${error.message}`)
  }

  return data as FavoriteFilm
}

/**
 * Removes a favorite film at a given position.
 */
export async function removeFavoriteFilm(position: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const { error } = await supabase
    .from('favorite_films')
    .delete()
    .eq('user_id', user.id)
    .eq('position', position)

  if (error) {
    console.error('removeFavoriteFilm error:', error.message)
    throw new Error(`Failed to remove favorite: ${error.message}`)
  }
}

/**
 * Fetches all favorite films for a given user, ordered by position (1→4).
 */
export async function getUserFavorites(userId: string): Promise<FavoriteFilm[]> {
  const { data, error } = await supabase
    .from('favorite_films')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) {
    console.error('getUserFavorites error:', error.message)
    return []
  }

  return (data ?? []) as FavoriteFilm[]
}
