import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { toggleCommentLike } from '@/services/likes'

export interface UseCommentLikeReturn {
  liked: boolean
  count: number
  toggle: () => void
}

// ---------------------------------------------------------------------------
// Module-level pub/sub store — mirrors useLike, keyed by commentId.
// TakeDetailScreen batch-fetches statuses and publishes them here, so this
// hook never self-hydrates (no N+1 requests per comment row).
// ---------------------------------------------------------------------------
type LikeStatus = { liked: boolean; count: number }
type Subscriber = (status: LikeStatus) => void

const likesCache = new Map<string, LikeStatus>()
const subscribers = new Map<string, Set<Subscriber>>()

function publish(commentId: string, status: LikeStatus) {
  likesCache.set(commentId, status)
  subscribers.get(commentId)?.forEach((cb) => cb(status))
}

export function publishCommentLikeStatus(commentId: string, status: LikeStatus) {
  publish(commentId, status)
}

function subscribe(commentId: string, cb: Subscriber) {
  if (!subscribers.has(commentId)) subscribers.set(commentId, new Set())
  subscribers.get(commentId)!.add(cb)
  return () => { subscribers.get(commentId)?.delete(cb) }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useCommentLike(commentId: string): UseCommentLikeReturn {
  const cached = likesCache.get(commentId)

  const [liked, setLiked] = useState(cached?.liked ?? false)
  const [count, setCount] = useState(cached?.count ?? 0)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  // Subscribe to broadcasts (batch fetch + other instances toggling)
  useEffect(() => {
    return subscribe(commentId, (status) => {
      if (isMounted.current) {
        setLiked(status.liked)
        setCount(status.count)
      }
    })
  }, [commentId])

  const toggle = useCallback(() => {
    const wasLiked = liked
    const prevCount = count
    const newLiked = !wasLiked
    const newCount = wasLiked ? prevCount - 1 : prevCount + 1

    publish(commentId, { liked: newLiked, count: newCount })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    toggleCommentLike(commentId).catch(() => {
      publish(commentId, { liked: wasLiked, count: prevCount })
    })
  }, [commentId, liked, count])

  return { liked, count, toggle }
}
