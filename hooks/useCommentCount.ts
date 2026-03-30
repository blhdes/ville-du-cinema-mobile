import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Module-level pub/sub store for comment counts
// useComments.addComment/removeComment publish here so TakeCard updates
// instantly when navigating back — no network round-trip needed.
// ---------------------------------------------------------------------------
type Subscriber = (count: number) => void

const countCache = new Map<string, number>()
const subscribers = new Map<string, Set<Subscriber>>()

export function publishCommentCount(takeId: string, count: number) {
  countCache.set(takeId, count)
  subscribers.get(takeId)?.forEach((cb) => cb(count))
}

export function useCommentCount(takeId: string, initialCount = 0): number {
  const cached = countCache.get(takeId)
  const [count, setCount] = useState(cached ?? initialCount)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  // Sync initial prop when it arrives from batch fetch — cache wins if fresher
  useEffect(() => {
    if (countCache.has(takeId)) return
    setCount(initialCount)
  }, [initialCount, takeId])

  // Subscribe to broadcasts from useComments
  useEffect(() => {
    if (!subscribers.has(takeId)) subscribers.set(takeId, new Set())
    const set = subscribers.get(takeId)!
    const cb: Subscriber = (c) => { if (isMounted.current) setCount(c) }
    set.add(cb)
    return () => { set.delete(cb) }
  }, [takeId])

  return count
}
