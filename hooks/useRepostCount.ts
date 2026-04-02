import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Module-level pub/sub store for take repost counts
// TakeCard.handleRepost publishes here for instant optimistic updates across
// all instances watching the same takeId — no network round-trip needed.
// ---------------------------------------------------------------------------
type Subscriber = (count: number) => void

const countCache = new Map<string, number>()
const subscribers = new Map<string, Set<Subscriber>>()

export function publishRepostCount(takeId: string, count: number) {
  countCache.set(takeId, count)
  subscribers.get(takeId)?.forEach((cb) => cb(count))
}

export function useRepostCount(takeId: string, initialCount = 0): number {
  const cached = countCache.get(takeId)
  const [count, setCount] = useState(cached ?? initialCount)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  // Sync initial prop when it arrives from batch fetch — cache wins if fresher
  useEffect(() => {
    if (countCache.has(takeId)) return
    setCount(initialCount)
  }, [initialCount, takeId])

  // Subscribe to optimistic broadcasts from handleRepost
  useEffect(() => {
    if (!subscribers.has(takeId)) subscribers.set(takeId, new Set())
    const set = subscribers.get(takeId)!
    const cb: Subscriber = (c) => { if (isMounted.current) setCount(c) }
    set.add(cb)
    return () => { set.delete(cb) }
  }, [takeId])

  return count
}
