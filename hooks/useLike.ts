import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { getLikeStatus, toggleLike } from '@/services/likes'

export interface UseLikeReturn {
  liked: boolean
  count: number
  isLoading: boolean
  toggle: () => void
}

/**
 * Module-level cache so every useLike instance for the same takeId
 * shares the latest optimistic state instantly — no network round-trip.
 */
const likesCache = new Map<string, { liked: boolean; count: number }>()

/**
 * Manages like state for a single Take with optimistic updates + haptic feedback.
 * When `initialLiked` and `initialCount` are provided (batch pre-fetch), skips the
 * initial network call.
 */
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

  // Hydrate from server if no initial values and no cache
  useEffect(() => {
    if (hasInitial || cached) return
    let cancelled = false

    getLikeStatus(takeId)
      .then((status) => {
        if (!cancelled && isMounted.current) {
          setLiked(status.liked)
          setCount(status.count)
          likesCache.set(takeId, { liked: status.liked, count: status.count })
        }
      })
      .finally(() => {
        if (!cancelled && isMounted.current) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [takeId, hasInitial, cached])

  // Sync from parent when batch data changes — but cache wins if fresher
  useEffect(() => {
    if (initialLiked === undefined) return
    const c = likesCache.get(takeId)
    if (c) {
      setLiked(c.liked)
      setCount(c.count)
    } else {
      setLiked(initialLiked)
    }
  }, [initialLiked, takeId])

  useEffect(() => {
    if (initialCount === undefined) return
    const c = likesCache.get(takeId)
    if (c) {
      setCount(c.count)
    } else {
      setCount(initialCount)
    }
  }, [initialCount, takeId])

  const toggle = useCallback(() => {
    // Optimistic update
    const wasLiked = liked
    const prevCount = count
    const newLiked = !wasLiked
    const newCount = wasLiked ? prevCount - 1 : prevCount + 1

    setLiked(newLiked)
    setCount(newCount)
    likesCache.set(takeId, { liked: newLiked, count: newCount })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    toggleLike(takeId).catch(() => {
      // Roll back on failure
      if (isMounted.current) {
        setLiked(wasLiked)
        setCount(prevCount)
      }
      likesCache.set(takeId, { liked: wasLiked, count: prevCount })
    })
  }, [takeId, liked, count])

  return { liked, count, isLoading, toggle }
}
