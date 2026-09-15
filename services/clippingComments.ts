/**
 * Clipping Comments Service
 * CRUD operations for comments on Clippings, keyed by original_url
 * (shared across the original clipping and every repost of it).
 */

import { supabase } from '@/lib/supabase/client'
import type { ClippingComment, Database } from '@/types/database'

type ClippingCommentRow = Database['public']['Tables']['clipping_comments']['Row']

function toComment(row: ClippingCommentRow): ClippingComment {
  return { ...row }
}

/**
 * Fetch all comments for a Clipping, oldest first (chat-thread order).
 */
export async function getClippingComments(originalUrl: string): Promise<ClippingComment[]> {
  const { data, error } = await supabase
    .from('clipping_comments')
    .select('*')
    .eq('original_url', originalUrl)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getClippingComments error:', error.message)
    return []
  }

  return (data ?? []).map(toComment)
}

/**
 * Create a comment on a Clipping.
 */
export async function createClippingComment(originalUrl: string, content: string): Promise<ClippingComment> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to comment.')

  const { data, error } = await supabase
    .from('clipping_comments')
    .insert({
      user_id: user.id,
      original_url: originalUrl,
      content,
    })
    .select()
    .single()

  if (error) {
    console.error('createClippingComment error:', error.message)
    throw new Error(`Failed to post comment: ${error.message}`)
  }

  return toComment(data)
}

/**
 * Delete a Clipping comment by ID.
 */
export async function deleteClippingComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('clipping_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('deleteClippingComment error:', error.message)
    throw new Error(`Failed to delete comment: ${error.message}`)
  }
}

/**
 * Batch-fetch comment counts for multiple Clippings (by original_url).
 * Returns a Map of original_url → count. Used by feeds to avoid N+1 queries.
 */
export async function getBatchClippingCommentCounts(originalUrls: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (originalUrls.length === 0) return result

  const { data, error } = await supabase
    .from('clipping_comments')
    .select('original_url')
    .in('original_url', originalUrls)

  if (error) {
    console.error('getBatchClippingCommentCounts error:', error.message)
    return result
  }

  for (const row of data ?? []) {
    result.set(row.original_url, (result.get(row.original_url) ?? 0) + 1)
  }

  return result
}
