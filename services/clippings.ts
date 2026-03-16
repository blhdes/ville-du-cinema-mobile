/**
 * Clippings Service
 * Handles saving and fetching user clippings from the `user_clippings` table.
 */

import { supabase } from '@/lib/supabase/client'
import type { Clipping } from '@/types/database'

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

  return data
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

  return data ?? []
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
