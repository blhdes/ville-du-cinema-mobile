/**
 * Likes Service
 * Toggle, query, and batch-fetch like status for Takes and Comments.
 */

import { supabase } from '@/lib/supabase/client'

export interface LikeStatus {
  liked: boolean
  count: number
}

/**
 * Toggle the current user's like on a Take.
 * Returns `true` if the take is now liked, `false` if unliked.
 */
export async function toggleLike(takeId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to like a Take.')

  // Check if already liked
  const { data: existing } = await supabase
    .from('take_likes')
    .select('take_id')
    .eq('user_id', user.id)
    .eq('take_id', takeId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('take_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('take_id', takeId)
    if (error) {
      console.error('toggleLike delete error:', error.message)
      throw new Error(`Failed to unlike: ${error.message}`)
    }
    return false
  }

  const { error } = await supabase
    .from('take_likes')
    .insert({ user_id: user.id, take_id: takeId })
  if (error) {
    console.error('toggleLike insert error:', error.message)
    throw new Error(`Failed to like: ${error.message}`)
  }
  return true
}

/**
 * Get like status for a single Take (is the current user liking it + total count).
 */
export async function getLikeStatus(takeId: string): Promise<LikeStatus> {
  const { data: { user } } = await supabase.auth.getUser()

  const [likedResult, countResult] = await Promise.allSettled([
    user
      ? supabase
          .from('take_likes')
          .select('take_id')
          .eq('user_id', user.id)
          .eq('take_id', takeId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('take_likes')
      .select('*', { count: 'exact', head: true })
      .eq('take_id', takeId),
  ])

  const liked = likedResult.status === 'fulfilled' && likedResult.value.data !== null
  const count = countResult.status === 'fulfilled' ? (countResult.value as { count: number | null }).count ?? 0 : 0

  return { liked, count }
}

/**
 * Batch-fetch like status for multiple Takes in two queries.
 * Used by the feed to avoid N+1 calls.
 */
export async function getBatchLikeStatus(takeIds: string[]): Promise<Map<string, LikeStatus>> {
  const result = new Map<string, LikeStatus>()
  if (takeIds.length === 0) return result

  // Initialize all with defaults
  for (const id of takeIds) {
    result.set(id, { liked: false, count: 0 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  const [userLikesResult, allLikesResult] = await Promise.allSettled([
    // Current user's likes among these takes
    user
      ? supabase
          .from('take_likes')
          .select('take_id')
          .eq('user_id', user.id)
          .in('take_id', takeIds)
      : Promise.resolve({ data: [] as { take_id: string }[] }),
    // All likes for these takes (for counting)
    supabase
      .from('take_likes')
      .select('take_id')
      .in('take_id', takeIds),
  ])

  // Mark liked takes
  if (userLikesResult.status === 'fulfilled') {
    const rows = (userLikesResult.value as { data: { take_id: string }[] | null }).data ?? []
    for (const row of rows) {
      const entry = result.get(row.take_id)
      if (entry) entry.liked = true
    }
  }

  // Count likes per take (client-side grouping)
  if (allLikesResult.status === 'fulfilled') {
    const rows = (allLikesResult.value as { data: { take_id: string }[] | null }).data ?? []
    const counts = new Map<string, number>()
    for (const row of rows) {
      counts.set(row.take_id, (counts.get(row.take_id) ?? 0) + 1)
    }
    for (const [takeId, count] of counts) {
      const entry = result.get(takeId)
      if (entry) entry.count = count
    }
  }

  return result
}

/**
 * Toggle the current user's like on a Comment.
 * Returns `true` if the comment is now liked, `false` if unliked.
 */
export async function toggleCommentLike(commentId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to like a comment.')

  // Check if already liked
  const { data: existing } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', user.id)
    .eq('comment_id', commentId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('comment_id', commentId)
    if (error) {
      console.error('toggleCommentLike delete error:', error.message)
      throw new Error(`Failed to unlike: ${error.message}`)
    }
    return false
  }

  const { error } = await supabase
    .from('comment_likes')
    .insert({ user_id: user.id, comment_id: commentId })
  if (error) {
    console.error('toggleCommentLike insert error:', error.message)
    throw new Error(`Failed to like: ${error.message}`)
  }
  return true
}

/**
 * Toggle the current user's like on a Clipping.
 * Keyed by original_url — shared across the original clipping and every
 * repost of it, mirroring how repost status is deduplicated.
 * Returns `true` if now liked, `false` if unliked.
 */
export async function toggleClippingLike(originalUrl: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to like a clipping.')

  const { data: existing } = await supabase
    .from('clipping_likes')
    .select('original_url')
    .eq('user_id', user.id)
    .eq('original_url', originalUrl)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('clipping_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('original_url', originalUrl)
    if (error) {
      console.error('toggleClippingLike delete error:', error.message)
      throw new Error(`Failed to unlike: ${error.message}`)
    }
    return false
  }

  const { error } = await supabase
    .from('clipping_likes')
    .insert({ user_id: user.id, original_url: originalUrl })
  if (error) {
    console.error('toggleClippingLike insert error:', error.message)
    throw new Error(`Failed to like: ${error.message}`)
  }
  return true
}

/**
 * Get like status for a single Clipping (is the current user liking it + total count).
 */
export async function getClippingLikeStatus(originalUrl: string): Promise<LikeStatus> {
  const { data: { user } } = await supabase.auth.getUser()

  const [likedResult, countResult] = await Promise.allSettled([
    user
      ? supabase
          .from('clipping_likes')
          .select('original_url')
          .eq('user_id', user.id)
          .eq('original_url', originalUrl)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('clipping_likes')
      .select('*', { count: 'exact', head: true })
      .eq('original_url', originalUrl),
  ])

  const liked = likedResult.status === 'fulfilled' && likedResult.value.data !== null
  const count = countResult.status === 'fulfilled' ? (countResult.value as { count: number | null }).count ?? 0 : 0

  return { liked, count }
}

/**
 * Batch-fetch like status for multiple Clippings (by original_url) in two queries.
 * Used by the feed to avoid N+1 calls.
 */
export async function getBatchClippingLikeStatus(originalUrls: string[]): Promise<Map<string, LikeStatus>> {
  const result = new Map<string, LikeStatus>()
  if (originalUrls.length === 0) return result

  for (const url of originalUrls) {
    result.set(url, { liked: false, count: 0 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  const [userLikesResult, allLikesResult] = await Promise.allSettled([
    user
      ? supabase
          .from('clipping_likes')
          .select('original_url')
          .eq('user_id', user.id)
          .in('original_url', originalUrls)
      : Promise.resolve({ data: [] as { original_url: string }[] }),
    supabase
      .from('clipping_likes')
      .select('original_url')
      .in('original_url', originalUrls),
  ])

  if (userLikesResult.status === 'fulfilled') {
    const rows = (userLikesResult.value as { data: { original_url: string }[] | null }).data ?? []
    for (const row of rows) {
      const entry = result.get(row.original_url)
      if (entry) entry.liked = true
    }
  }

  if (allLikesResult.status === 'fulfilled') {
    const rows = (allLikesResult.value as { data: { original_url: string }[] | null }).data ?? []
    const counts = new Map<string, number>()
    for (const row of rows) {
      counts.set(row.original_url, (counts.get(row.original_url) ?? 0) + 1)
    }
    for (const [url, count] of counts) {
      const entry = result.get(url)
      if (entry) entry.count = count
    }
  }

  return result
}

/**
 * Batch-fetch like status for multiple Comments in two queries.
 * Used by TakeDetailScreen to avoid N+1 calls on the comment thread.
 */
export async function getBatchCommentLikeStatus(commentIds: string[]): Promise<Map<string, LikeStatus>> {
  const result = new Map<string, LikeStatus>()
  if (commentIds.length === 0) return result

  // Initialize all with defaults
  for (const id of commentIds) {
    result.set(id, { liked: false, count: 0 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  const [userLikesResult, allLikesResult] = await Promise.allSettled([
    // Current user's likes among these comments
    user
      ? supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds)
      : Promise.resolve({ data: [] as { comment_id: string }[] }),
    // All likes for these comments (for counting)
    supabase
      .from('comment_likes')
      .select('comment_id')
      .in('comment_id', commentIds),
  ])

  // Mark liked comments
  if (userLikesResult.status === 'fulfilled') {
    const rows = (userLikesResult.value as { data: { comment_id: string }[] | null }).data ?? []
    for (const row of rows) {
      const entry = result.get(row.comment_id)
      if (entry) entry.liked = true
    }
  }

  // Count likes per comment (client-side grouping)
  if (allLikesResult.status === 'fulfilled') {
    const rows = (allLikesResult.value as { data: { comment_id: string }[] | null }).data ?? []
    const counts = new Map<string, number>()
    for (const row of rows) {
      counts.set(row.comment_id, (counts.get(row.comment_id) ?? 0) + 1)
    }
    for (const [commentId, count] of counts) {
      const entry = result.get(commentId)
      if (entry) entry.count = count
    }
  }

  return result
}
