import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { getClippingLikeStatus, toggleClippingLike } from '@/services/likes'

export interface UseClippingLikeReturn {
  liked: boolean
  count: number
  isLoading: boolean
  toggle: () => void
}

// ---------------------------------------------------------------------------
// Module-level pub/sub store — mirrors useLike, keyed by original_url so a
// like on any repost of a quote is reflected everywhere that quote renders.
// ---------------------------------------------------------------------------
type LikeStatus = { liked: boolean; count: number }
type Subscriber = (status: LikeStatus) => void

const likesCache = new Map<string, LikeStatus>()
const subscribers = new Map<string, Set<Subscriber>>()

function publish(originalUrl: string, status: LikeStatus) {
  likesCache.set(originalUrl, status)
  subscribers.get(originalUrl)?.forEach((cb) => cb(status))
}

export function publishClippingLikeStatus(originalUrl: string, status: LikeStatus) {
  publish(originalUrl, status)
}

function subscribe(originalUrl: string, cb: Subscriber) {
  if (!subscribers.has(originalUrl)) subscribers.set(originalUrl, new Set())
  subscribers.get(originalUrl)!.add(cb)
  return () => { subscribers.get(originalUrl)?.delete(cb) }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useClippingLike(
  originalUrl: string,
  initialLiked?: boolean,
  initialCount?: number,
): UseClippingLikeReturn {
  const hasInitial = initialLiked !== undefined && initialCount !== undefined
  const cached = likesCache.get(originalUrl)

  const [liked, setLiked] = useState(cached?.liked ?? initialLiked ?? false)
  const [count, setCount] = useState(cached?.count ?? initialCount ?? 0)
  const [isLoading, setIsLoading] = useState(!hasInitial && !cached)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  useEffect(() => {
    return subscribe(originalUrl, (status) => {
      if (isMounted.current) {
        setLiked(status.liked)
        setCount(status.count)
      }
    })
  }, [originalUrl])

  // Hydrate from server if no initial values and no cache
  useEffect(() => {
    if (hasInitial || cached) return
    let cancelled = false

    getClippingLikeStatus(originalUrl)
      .then((status) => {
        if (!cancelled && isMounted.current) {
          publish(originalUrl, { liked: status.liked, count: status.count })
        }
      })
      .finally(() => {
        if (!cancelled && isMounted.current) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [originalUrl, hasInitial, cached])

  // Sync from parent batch refetch — cache/broadcast win if already fresher
  useEffect(() => {
    if (initialLiked === undefined) return
    const c = likesCache.get(originalUrl)
    if (!c) {
      setLiked(initialLiked)
    }
  }, [initialLiked, originalUrl])

  useEffect(() => {
    if (initialCount === undefined) return
    const c = likesCache.get(originalUrl)
    if (!c) {
      setCount(initialCount)
    }
  }, [initialCount, originalUrl])

  const toggle = useCallback(() => {
    const wasLiked = liked
    const prevCount = count
    const newLiked = !wasLiked
    const newCount = wasLiked ? prevCount - 1 : prevCount + 1

    publish(originalUrl, { liked: newLiked, count: newCount })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    toggleClippingLike(originalUrl).catch(() => {
      publish(originalUrl, { liked: wasLiked, count: prevCount })
    })
  }, [originalUrl, liked, count])

  return { liked, count, isLoading, toggle }
}
