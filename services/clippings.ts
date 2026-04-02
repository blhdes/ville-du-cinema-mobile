/**
 * Clippings Service
 * Handles saving and fetching user clippings from the `user_clippings` table.
 */

import { supabase } from '@/lib/supabase/client'
import type { Clipping, Database, Review, Take } from '@/types/database'
import { stripHtml } from '@/utils/html'

type ClippingRow = Database['public']['Tables']['user_clippings']['Row']

/** Map a Supabase row (loose types) to the stricter app-level Clipping interface. */
function toClipping(row: ClippingRow): Clipping {
  return {
    ...row,
    type: row.type as Clipping['type'],
    review_json: row.review_json as Clipping['review_json'],
  }
}

/** Payload for creating a new clipping (user_id comes from auth). */
interface SaveClippingPayload {
  quote_text: string
  movie_title: string
  author_name: string
  original_url: string
  /** TMDB film ID — anchors this clipping to a Film Card. Nullable for backwards compat. */
  tmdb_id?: number | null
}

/**
 * Inserts a new clipping for the currently authenticated user.
 * Throws if the user is not logged in or the insert fails.
 */
export async function saveClipping(payload: SaveClippingPayload): Promise<Clipping> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to save a clipping.')
  }

  const { data, error } = await supabase
    .from('user_clippings')
    .insert({
      user_id: user.id,
      quote_text: payload.quote_text,
      movie_title: payload.movie_title,
      author_name: payload.author_name,
      original_url: payload.original_url,
      tmdb_id: payload.tmdb_id ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('saveClipping error:', error.message)
    throw new Error(`Failed to save clipping: ${error.message}`)
  }

  return toClipping(data)
}

/**
 * Fetches all clippings for a given user, newest first.
 * Returns an empty array if the user has no clippings or an error occurs.
 */
export async function getUserClippings(userId: string): Promise<Clipping[]> {
  const { data, error } = await supabase
    .from('user_clippings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getUserClippings error:', error.message)
    return []
  }

  return (data ?? []).map(toClipping)
}

/**
 * Fetches clippings for a list of Village user IDs, newest first.
 * Used to populate followed users' clippings in the feed.
 */
export async function getVillageClippings(userIds: string[]): Promise<Clipping[]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('user_clippings')
    .select('*')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getVillageClippings error:', error.message)
    return []
  }

  return (data ?? []).map(toClipping)
}

/**
 * Saves a full review as a repost in the user's clippings.
 * Stores the complete Review object in `review_json` for rich rendering.
 */
export async function saveRepost(review: Review, tmdbId?: number | null): Promise<Clipping> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to repost.')
  }

  // Remove previous repost of the same review (if any) so it resurfaces as fresh
  await supabase
    .from('user_clippings')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'repost')
    .eq('original_url', review.link)

  const { data, error } = await supabase
    .from('user_clippings')
    .insert({
      user_id: user.id,
      type: 'repost',
      quote_text: stripHtml(review.review),
      movie_title: review.movieTitle,
      author_name: review.creator,
      original_url: review.link,
      review_json: JSON.parse(JSON.stringify(review)),
      tmdb_id: tmdbId ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('saveRepost error:', error.message)
    throw new Error(`Failed to save repost: ${error.message}`)
  }

  return toClipping(data)
}

/**
 * Saves a Take as a repost in the user's clippings.
 * Stores the complete Take object in `review_json` for rich rendering.
 */
export async function saveRepostTake(take: Take, authorDisplayName: string): Promise<Clipping> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to repost.')
  }

  // Remove previous repost of the same take (if any) so it resurfaces as fresh
  await supabase
    .from('user_clippings')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'take-repost')
    .eq('original_url', `take:${take.id}`)

  const { data, error } = await supabase
    .from('user_clippings')
    .insert({
      user_id: user.id,
      type: 'take-repost',
      quote_text: take.content,
      movie_title: take.movie_title,
      author_name: authorDisplayName,
      original_url: `take:${take.id}`,
      review_json: JSON.parse(JSON.stringify(take)),
      tmdb_id: take.tmdb_id,
    })
    .select()
    .single()

  if (error) {
    console.error('saveRepostTake error:', error.message)
    throw new Error(`Failed to save take repost: ${error.message}`)
  }

  return toClipping(data)
}

/**
 * Saves a Clipping as a repost in the user's clippings.
 * Stores the complete Clipping object in `review_json` for rich rendering.
 */
export async function saveRepostClipping(clipping: Clipping): Promise<Clipping> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to repost.')
  }

  // Remove previous repost of the same clipping (if any) so it resurfaces as fresh
  await supabase
    .from('user_clippings')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'clipping-repost')
    .eq('original_url', clipping.original_url)

  const { data, error } = await supabase
    .from('user_clippings')
    .insert({
      user_id: user.id,
      type: 'clipping-repost',
      quote_text: clipping.quote_text,
      movie_title: clipping.movie_title,
      author_name: clipping.author_name,
      original_url: clipping.original_url,
      review_json: JSON.parse(JSON.stringify(clipping)),
      tmdb_id: clipping.tmdb_id,
    })
    .select()
    .single()

  if (error) {
    console.error('saveRepostClipping error:', error.message)
    throw new Error(`Failed to save clipping repost: ${error.message}`)
  }

  return toClipping(data)
}

/**
 * Fetches all clippings anchored to a specific film (by TMDB ID), newest first.
 * Used on Film Card screens to show what people have clipped about a movie.
 */
export async function getFilmClippings(tmdbId: number): Promise<Clipping[]> {
  const { data, error } = await supabase
    .from('user_clippings')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getFilmClippings error:', error.message)
    return []
  }

  return (data ?? []).map(toClipping)
}

/**
 * Batch-fetch repost counts for multiple Takes.
 * Counts `user_clippings` rows with type='take-repost' and matching original_url.
 * Returns a Map of take_id → count. Used by feeds to avoid N+1 queries.
 */
export async function getBatchRepostCounts(takeIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (takeIds.length === 0) return result

  const urls = takeIds.map((id) => `take:${id}`)

  const { data, error } = await supabase
    .from('user_clippings')
    .select('original_url')
    .eq('type', 'take-repost')
    .in('original_url', urls)

  if (error) {
    console.error('getBatchRepostCounts error:', error.message)
    return result
  }

  for (const row of data ?? []) {
    const takeId = row.original_url.replace('take:', '')
    result.set(takeId, (result.get(takeId) ?? 0) + 1)
  }

  return result
}

/**
 * Deletes a clipping by its ID.
 * Throws if the delete fails.
 */
export async function deleteClipping(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_clippings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteClipping error:', error.message)
    throw new Error(`Failed to delete clipping: ${error.message}`)
  }
}
