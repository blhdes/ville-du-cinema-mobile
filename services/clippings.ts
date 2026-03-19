/**
 * Clippings Service
 * Handles saving and fetching user clippings from the `user_clippings` table.
 */

import { supabase } from '@/lib/supabase/client'
import type { Clipping, Database, Review } from '@/types/database'
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
export async function saveRepost(review: Review): Promise<Clipping> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to repost.')
  }

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
