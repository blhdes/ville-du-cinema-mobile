/**
 * Comments Service
 * CRUD operations for comments on Takes.
 */

import { supabase } from '@/lib/supabase/client'
import type { TakeComment, Database } from '@/types/database'

type CommentRow = Database['public']['Tables']['take_comments']['Row']

function toComment(row: CommentRow): TakeComment {
  return { ...row }
}

/**
 * Fetch all comments for a Take, oldest first (chat-thread order).
 */
export async function getComments(takeId: string): Promise<TakeComment[]> {
  const { data, error } = await supabase
    .from('take_comments')
    .select('*')
    .eq('take_id', takeId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getComments error:', error.message)
    return []
  }

  return (data ?? []).map(toComment)
}

/**
 * Create a comment on a Take.
 */
export async function createComment(takeId: string, content: string): Promise<TakeComment> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to comment.')

  const { data, error } = await supabase
    .from('take_comments')
    .insert({
      user_id: user.id,
      take_id: takeId,
      content,
    })
    .select()
    .single()

  if (error) {
    console.error('createComment error:', error.message)
    throw new Error(`Failed to post comment: ${error.message}`)
  }

  return toComment(data)
}

/**
 * Delete a comment by ID.
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('take_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('deleteComment error:', error.message)
    throw new Error(`Failed to delete comment: ${error.message}`)
  }
}

/**
 * Batch-fetch comment counts for multiple Takes.
 * Returns a Map of take_id → count. Used by feeds to avoid N+1 queries.
 */
export async function getBatchCommentCounts(takeIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (takeIds.length === 0) return result

  const { data, error } = await supabase
    .from('take_comments')
    .select('take_id')
    .in('take_id', takeIds)

  if (error) {
    console.error('getBatchCommentCounts error:', error.message)
    return result
  }

  for (const row of data ?? []) {
    result.set(row.take_id, (result.get(row.take_id) ?? 0) + 1)
  }

  return result
}
