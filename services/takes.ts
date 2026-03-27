/**
 * Takes Service
 * CRUD operations for short-form posts anchored to TMDB films.
 */

import { supabase } from '@/lib/supabase/client'
import type { Take, Database } from '@/types/database'

type TakeRow = Database['public']['Tables']['takes']['Row']

function toTake(row: TakeRow): Take {
  return { ...row }
}

interface CreateTakePayload {
  tmdb_id: number
  movie_title: string
  poster_path: string | null
  content: string
}

/**
 * Creates a new Take for the authenticated user.
 * Throws if not signed in or the insert fails.
 */
export async function createTake(payload: CreateTakePayload): Promise<Take> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to post a Take.')
  }

  const { data, error } = await supabase
    .from('takes')
    .insert({
      user_id: user.id,
      tmdb_id: payload.tmdb_id,
      movie_title: payload.movie_title,
      poster_path: payload.poster_path,
      content: payload.content,
    })
    .select()
    .single()

  if (error) {
    console.error('createTake error:', error.message)
    throw new Error(`Failed to create Take: ${error.message}`)
  }

  return toTake(data)
}

/**
 * Fetches a single Take by ID.
 */
export async function getTakeById(takeId: string): Promise<Take | null> {
  const { data, error } = await supabase
    .from('takes')
    .select('*')
    .eq('id', takeId)
    .maybeSingle()

  if (error) {
    console.error('getTakeById error:', error.message)
    return null
  }

  return data ? toTake(data) : null
}

/**
 * Fetches all Takes for a given user, newest first.
 */
export async function getUserTakes(userId: string): Promise<Take[]> {
  const { data, error } = await supabase
    .from('takes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getUserTakes error:', error.message)
    return []
  }

  return (data ?? []).map(toTake)
}

/**
 * Fetches all Takes about a specific film (by TMDB ID), newest first.
 */
export async function getFilmTakes(tmdbId: number): Promise<Take[]> {
  const { data, error } = await supabase
    .from('takes')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getFilmTakes error:', error.message)
    return []
  }

  return (data ?? []).map(toTake)
}

/**
 * Fetches Takes from a list of Village user IDs, newest first.
 * Used to populate the feed with Takes from followed users.
 */
export async function getVillageTakes(userIds: string[]): Promise<Take[]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('takes')
    .select('*')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getVillageTakes error:', error.message)
    return []
  }

  return (data ?? []).map(toTake)
}

/**
 * A film that Village users in your network have been posting about.
 * Grouped by tmdb_id with a take count and the most recent poster path.
 */
export interface NetworkFilm {
  tmdbId: number
  movieTitle: string
  posterPath: string | null
  takeCount: number
}

/**
 * Fetches films that followed Village users have recently posted about.
 * Groups takes by tmdb_id client-side and returns the top N films
 * sorted by take count (most talked-about first).
 */
export async function getNetworkFilms(
  userIds: string[],
  limit = 10,
): Promise<NetworkFilm[]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('takes')
    .select('tmdb_id, movie_title, poster_path')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(200) // recent window — enough to surface active films

  if (error) {
    console.error('getNetworkFilms error:', error.message)
    return []
  }

  // Group by tmdb_id, count takes, keep the first (most recent) poster
  const filmMap = new Map<number, NetworkFilm>()
  for (const row of data ?? []) {
    const existing = filmMap.get(row.tmdb_id)
    if (existing) {
      existing.takeCount += 1
    } else {
      filmMap.set(row.tmdb_id, {
        tmdbId: row.tmdb_id,
        movieTitle: row.movie_title,
        posterPath: row.poster_path,
        takeCount: 1,
      })
    }
  }

  return [...filmMap.values()]
    .sort((a, b) => b.takeCount - a.takeCount)
    .slice(0, limit)
}

/**
 * Deletes a Take by its ID.
 */
export async function deleteTake(id: string): Promise<void> {
  const { error } = await supabase
    .from('takes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteTake error:', error.message)
    throw new Error(`Failed to delete Take: ${error.message}`)
  }
}
