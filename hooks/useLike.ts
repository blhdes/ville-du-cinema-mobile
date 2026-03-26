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
  const [liked, setLiked] = useState(initialLiked ?? false)
  const [count, setCount] = useState(initialCount ?? 0)
  const [isLoading, setIsLoading] = useState(!hasInitial)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  // Hydrate from server if no initial values provided
  useEffect(() => {
    if (hasInitial) return
    let cancelled = false

    getLikeStatus(takeId)
      .then((status) => {
        if (!cancelled && isMounted.current) {
          setLiked(status.liked)
          setCount(status.count)
        }
      })
      .finally(() => {
        if (!cancelled && isMounted.current) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [takeId, hasInitial])

  // Sync from parent when batch data changes
  useEffect(() => {
    if (initialLiked !== undefined) setLiked(initialLiked)
  }, [initialLiked])

  useEffect(() => {
    if (initialCount !== undefined) setCount(initialCount)
  }, [initialCount])

  const toggle = useCallback(() => {
    // Optimistic update
    const wasLiked = liked
    const prevCount = count
    setLiked(!wasLiked)
    setCount(wasLiked ? prevCount - 1 : prevCount + 1)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    toggleLike(takeId).catch(() => {
      // Roll back on failure
      if (isMounted.current) {
        setLiked(wasLiked)
        setCount(prevCount)
      }
    })
  }, [takeId, liked, count])

  return { liked, count, isLoading, toggle }
}
