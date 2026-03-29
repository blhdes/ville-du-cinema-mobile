import type {
  TmdbMovieDetail,
  TmdbSearchResult,
  TmdbPaginatedResponse,
} from '@/types/tmdb'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? ''
const BASE_URL = 'https://api.themoviedb.org/3'

/** TMDB image CDN — append a poster_path or backdrop_path to get the full URL. */
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

/** Common poster sizes. w342 is a good balance for list cards, w500 for detail. */
export const posterUrl = (path: string | null, size: 'w154' | 'w342' | 'w500' = 'w342') =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null

export const backdropUrl = (path: string | null, size: 'w780' | 'w1280' = 'w780') =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null

// ---------------------------------------------------------------------------
// In-memory cache (avoids re-fetching during a session)
// ---------------------------------------------------------------------------

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

const detailCache = new Map<number, CacheEntry<TmdbMovieDetail>>()
const searchCache = new Map<string, CacheEntry<TmdbPaginatedResponse<TmdbSearchResult>>>()

function getCached<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key is not configured. Add EXPO_PUBLIC_TMDB_API_KEY to your .env file.')
  }

  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('api_key', TMDB_API_KEY)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString())

  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * TMDB occasionally stores titles with surrounding quotation marks as part of
 * the official title (e.g. `"Wuthering Heights"`). Strip them so the UI never
 * shows bare quote characters around a film title.
 */
function cleanTitle(title: string): string {
  return title.replace(/^["'"']+|["'"']+$/gu, '').trim()
}

function cleanSearchResult(r: TmdbSearchResult): TmdbSearchResult {
  return { ...r, title: cleanTitle(r.title) }
}

function cleanMovieDetail(d: TmdbMovieDetail): TmdbMovieDetail {
  return { ...d, title: cleanTitle(d.title) }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch full movie details including credits and videos in a single call.
 * Uses TMDB's `append_to_response` to avoid extra round-trips.
 */
export async function getMovieDetail(tmdbId: number): Promise<TmdbMovieDetail> {
  const cached = getCached(detailCache, tmdbId)
  if (cached) return cached

  const data = await tmdbFetch<TmdbMovieDetail>(`/movie/${tmdbId}`, {
    append_to_response: 'credits,videos',
  })

  const clean = cleanMovieDetail(data)
  detailCache.set(tmdbId, { data: clean, fetchedAt: Date.now() })
  return clean
}

/**
 * Search for movies by title. Returns a paginated list.
 * Results are cached per query string.
 */
export async function searchMovies(
  query: string,
  page = 1,
): Promise<TmdbPaginatedResponse<TmdbSearchResult>> {
  const cacheKey = `${query.toLowerCase().trim()}|${page}`
  const cached = getCached(searchCache, cacheKey)
  if (cached) return cached

  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbSearchResult>>('/search/movie', {
    query,
    page: String(page),
  })

  const clean = { ...data, results: data.results.map(cleanSearchResult) }
  searchCache.set(cacheKey, { data: clean, fetchedAt: Date.now() })
  return data
}

/**
 * Fetch trending movies for the week (or day).
 */
export async function getTrending(
  window: 'day' | 'week' = 'week',
): Promise<TmdbPaginatedResponse<TmdbSearchResult>> {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbSearchResult>>(`/trending/movie/${window}`)
  return { ...data, results: data.results.map(cleanSearchResult) }
}

/**
 * Search TMDB by movie title and return the best match.
 * Useful for linking an RSS review (which only has a title string) to a TMDB ID.
 */
export async function findMovieByTitle(title: string): Promise<TmdbSearchResult | null> {
  const results = await searchMovies(title)
  return results.results[0] ?? null
}

/** Clear all in-memory caches (useful for pull-to-refresh). */
export function clearTmdbCache(): void {
  detailCache.clear()
  searchCache.clear()
}
