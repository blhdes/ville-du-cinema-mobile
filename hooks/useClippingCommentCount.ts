import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Module-level pub/sub store for clipping comment counts, keyed by original_url.
// Mirrors useCommentCount — useClippingComments publishes here so
// ClippingCard/ClippingRepostCard update instantly when navigating back.
// ---------------------------------------------------------------------------
type Subscriber = (count: number) => void

const countCache = new Map<string, number>()
const subscribers = new Map<string, Set<Subscriber>>()

export function publishClippingCommentCount(originalUrl: string, count: number) {
  countCache.set(originalUrl, count)
  subscribers.get(originalUrl)?.forEach((cb) => cb(count))
}

export function useClippingCommentCount(originalUrl: string, initialCount = 0): number {
  const cached = countCache.get(originalUrl)
  const [count, setCount] = useState(cached ?? initialCount)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  useEffect(() => {
    if (countCache.has(originalUrl)) return
    setCount(initialCount)
  }, [initialCount, originalUrl])

  useEffect(() => {
    if (!subscribers.has(originalUrl)) subscribers.set(originalUrl, new Set())
    const set = subscribers.get(originalUrl)!
    const cb: Subscriber = (c) => { if (isMounted.current) setCount(c) }
    set.add(cb)
    return () => { set.delete(cb) }
  }, [originalUrl])

  return count
}
