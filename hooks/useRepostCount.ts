import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Module-level pub/sub store for take repost status (reposted + count)
// Mirrors the useLike pattern — optimistic updates propagate to all instances.
// ---------------------------------------------------------------------------
export type RepostStatus = { reposted: boolean; count: number }
type Subscriber = (status: RepostStatus) => void

const statusCache = new Map<string, RepostStatus>()
const subscribers = new Map<string, Set<Subscriber>>()

export function publishRepostStatus(takeId: string, status: RepostStatus) {
  statusCache.set(takeId, status)
  subscribers.get(takeId)?.forEach((cb) => cb(status))
}

export function useRepost(
  takeId: string,
  initialReposted?: boolean,
  initialCount?: number,
): RepostStatus {
  const hasInitial = initialReposted !== undefined && initialCount !== undefined
  const cached = statusCache.get(takeId)

  const [reposted, setReposted] = useState(cached?.reposted ?? initialReposted ?? false)
  const [count, setCount] = useState(cached?.count ?? initialCount ?? 0)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  // Subscribe to broadcasts from handleRepost
  useEffect(() => {
    if (!subscribers.has(takeId)) subscribers.set(takeId, new Set())
    const set = subscribers.get(takeId)!
    const cb: Subscriber = (s) => {
      if (isMounted.current) {
        setReposted(s.reposted)
        setCount(s.count)
      }
    }
    set.add(cb)
    return () => { set.delete(cb) }
  }, [takeId])

  // Sync initial props when they arrive from batch fetch — cache wins if fresher
  useEffect(() => {
    if (initialReposted === undefined) return
    if (statusCache.has(takeId)) return
    setReposted(initialReposted)
  }, [initialReposted, takeId])

  useEffect(() => {
    if (initialCount === undefined) return
    if (statusCache.has(takeId)) return
    setCount(initialCount)
  }, [initialCount, takeId])

  return { reposted, count }
}
