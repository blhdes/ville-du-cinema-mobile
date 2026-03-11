import { useEffect, useState } from 'react'
import storage from '@/lib/storage'

const STORAGE_KEY = 'avatar_cache'

/** In-memory mirror of the AsyncStorage dictionary for synchronous reads. */
let memoryCache: Record<string, string> = {}
/** Whether the AsyncStorage has been loaded into memory yet. */
let loaded = false
/** Listeners that get called whenever the cache updates. */
const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}

/** Load the persisted dictionary into memory. Safe to call multiple times. */
async function hydrate(): Promise<void> {
  if (loaded) return
  const data = await storage.getItem<Record<string, string>>(STORAGE_KEY)
  if (data) memoryCache = data
  loaded = true
  notify()
}

/** Persist the current in-memory cache to AsyncStorage. */
async function persist(): Promise<void> {
  await storage.setItem(STORAGE_KEY, memoryCache)
}

/**
 * Get a cached avatar URL for a username. Returns undefined if not cached.
 * Synchronous — reads from the in-memory mirror.
 */
export function getAvatarUrl(username: string): string | undefined {
  return memoryCache[username]
}

/**
 * Save a single avatar URL to the cache (both memory + disk).
 */
export async function setAvatarUrl(username: string, url: string): Promise<void> {
  if (memoryCache[username] === url) return
  memoryCache[username] = url
  notify()
  await persist()
}

/**
 * Save multiple avatar URLs at once (batch write).
 */
export async function setAvatarUrls(entries: Record<string, string>): Promise<void> {
  let changed = false
  for (const [username, url] of Object.entries(entries)) {
    if (memoryCache[username] !== url) {
      memoryCache[username] = url
      changed = true
    }
  }
  if (!changed) return
  notify()
  await persist()
}

/**
 * React hook — returns the cached avatar URL for a username.
 * Reactively updates when the cache changes (e.g. after a background scrape).
 */
export function useAvatarUrl(username: string): string | undefined {
  const [url, setUrl] = useState(() => getAvatarUrl(username))

  useEffect(() => {
    // Ensure hydration has happened
    if (!loaded) {
      hydrate().then(() => setUrl(getAvatarUrl(username)))
    }

    const listener = () => {
      const latest = getAvatarUrl(username)
      setUrl((prev) => (prev !== latest ? latest : prev))
    }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [username])

  return url
}

/** Ensure the cache is hydrated. Call once at app startup. */
export { hydrate as hydrateAvatarCache }
