import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Module-level pub/sub store for clipping repost status (reposted + count).
// Mirrors useRepostCount — keyed by clipping.original_url.
// ---------------------------------------------------------------------------
export type RepostStatus = { reposted: boolean; count: number }
type Subscriber = (status: RepostStatus) => void

const statusCache = new Map<string, RepostStatus>()
const subscribers = new Map<string, Set<Subscriber>>()

export function publishClippingRepostStatus(clippingUrl: string, status: RepostStatus) {
  statusCache.set(clippingUrl, status)
  subscribers.get(clippingUrl)?.forEach((cb) => cb(status))
}

export function useClippingRepost(
  clippingUrl: string,
  initialReposted?: boolean,
  initialCount?: number,
): RepostStatus {
  const cached = statusCache.get(clippingUrl)

  const [reposted, setReposted] = useState(cached?.reposted ?? initialReposted ?? false)
  const [count, setCount] = useState(cached?.count ?? initialCount ?? 0)
  const isMounted = useRef(true)

  useEffect(() => () => { isMounted.current = false }, [])

  // Subscribe to broadcasts from handleRepost
  useEffect(() => {
    if (!subscribers.has(clippingUrl)) subscribers.set(clippingUrl, new Set())
    const set = subscribers.get(clippingUrl)!
    const cb: Subscriber = (s) => {
      if (isMounted.current) {
        setReposted(s.reposted)
        setCount(s.count)
      }
    }
    set.add(cb)
    return () => { set.delete(cb) }
  }, [clippingUrl])

  // Sync initial props when they arrive — cache wins if fresher
  useEffect(() => {
    if (initialReposted === undefined) return
    if (statusCache.has(clippingUrl)) return
    setReposted(initialReposted)
  }, [initialReposted, clippingUrl])

  useEffect(() => {
    if (initialCount === undefined) return
    if (statusCache.has(clippingUrl)) return
    setCount(initialCount)
  }, [initialCount, clippingUrl])

  return { reposted, count }
}
