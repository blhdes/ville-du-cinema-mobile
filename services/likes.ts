/**
 * Likes Service
 * Toggle, query, and batch-fetch like status for Takes.
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
