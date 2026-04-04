import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { getLikeStatus, toggleLike } from '@/services/likes'

export interface UseLikeReturn {
  liked: boolean
  count: number
  isLoading: boolean
  toggle: () => void
}

// ---------------------------------------------------------------------------
// Module-level pub/sub store
// Any useLike instance that calls toggle() broadcasts to all other instances
// watching the same takeId — no network round-trip needed.
// ---------------------------------------------------------------------------
type LikeStatus = { liked: boolean; count: number }
type Subscriber = (status: LikeStatus) => void

const likesCache = new Map<string, LikeStatus>()
const subscribers = new Map<string, Set<Subscriber>>()

function publish(takeId: string, status: LikeStatus) {
  likesCache.set(takeId, status)
  subscribers.get(takeId)?.forEach((cb) => cb(status))
}

export function publishLikeStatus(takeId: string, status: LikeStatus) {
  publish(takeId, status)
}

function subscribe(takeId: string, cb: Subscriber) {
  if (!subscribers.has(takeId)) subscribers.set(takeId, new Set())
  subscribers.get(takeId)!.add(cb)
  return () => { subscribers.get(takeId)?.delete(cb) }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useLike(
  takeId: string,
  initialLiked?: boolean,
  initialCount?: number,
): UseLikeReturn {
  const hasInitial = initialLiked !== undefined && initialCount !== undefined
  const cached = likesCache.get(takeId)

  const [liked, setLiked] = useState(cached?.liked ?? initialLiked ?? false)
  const [count, setCount] = useState(cached?.count ?? initialCount ?? 0)
  const [isLoading, setIsLoading] = useState(!hasInitial && !cached)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  // Subscribe to broadcasts from other instances (e.g. TakeDetail → TakeCard)
  useEffect(() => {
    return subscribe(takeId, (status) => {
      if (isMounted.current) {
        setLiked(status.liked)
        setCount(status.count)
      }
    })
  }, [takeId])

  // Hydrate from server if no initial values and no cache
  useEffect(() => {
    if (hasInitial || cached) return
    let cancelled = false

    getLikeStatus(takeId)
      .then((status) => {
        if (!cancelled && isMounted.current) {
          publish(takeId, { liked: status.liked, count: status.count })
        }
      })
      .finally(() => {
        if (!cancelled && isMounted.current) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [takeId, hasInitial, cached])

  // Sync from parent batch refetch — cache/broadcast win if already fresher
  useEffect(() => {
    if (initialLiked === undefined) return
    const c = likesCache.get(takeId)
    if (!c) {
      setLiked(initialLiked)
    }
  }, [initialLiked, takeId])

  useEffect(() => {
    if (initialCount === undefined) return
    const c = likesCache.get(takeId)
    if (!c) {
      setCount(initialCount)
    }
  }, [initialCount, takeId])

  const toggle = useCallback(() => {
    const wasLiked = liked
    const prevCount = count
    const newLiked = !wasLiked
    const newCount = wasLiked ? prevCount - 1 : prevCount + 1

    publish(takeId, { liked: newLiked, count: newCount })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    toggleLike(takeId).catch(() => {
      publish(takeId, { liked: wasLiked, count: prevCount })
    })
  }, [takeId, liked, count])

  return { liked, count, isLoading, toggle }
}
