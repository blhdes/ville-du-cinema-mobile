import { XMLParser } from 'fast-xml-parser'
import type { Review } from '@/types/database'

const PAGE_SIZE = 50

/** In-memory avatar URL cache keyed by Letterboxd username. Persists for app lifetime. */
const avatarCache = new Map<string, string>()
/** Tracks in-flight avatar fetches so we don't duplicate requests. */
const avatarFetching = new Map<string, Promise<string | undefined>>()

/**
 * Scrape the user's avatar URL from their Letterboxd profile page.
 * Looks for the 220px avatar image. Cached in-memory after first fetch.
 */
async function fetchAvatarUrl(username: string): Promise<string | undefined> {
  const cached = avatarCache.get(username)
  if (cached) return cached

  // Deduplicate concurrent fetches for the same user
  const existing = avatarFetching.get(username)
  if (existing) return existing

  const promise = (async () => {
    try {
      const res = await fetch(`https://letterboxd.com/${username}/`)
      if (!res.ok) return undefined
      const html = await res.text()
      // Match the avatar img src — Letterboxd uses a.ltrbxd.com/resized/avatar/
      const match = html.match(/src="(https:\/\/a\.ltrbxd\.com\/resized\/avatar\/[^"]*-0-220-0-220-crop[^"]*)"/i)
      const url = match?.[1]
      if (url) avatarCache.set(username, url)
      return url
    } catch {
      return undefined
    } finally {
      avatarFetching.delete(username)
    }
  })()

  avatarFetching.set(username, promise)
  return promise
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Preserve HTML inside CDATA sections (Letterboxd wraps descriptions in CDATA)
  htmlEntities: true,
})

function extractRating(title: string): string {
  const match = title.match(/ - ([★½]+)$/)
  return match ? match[1] : ''
}

function extractMovieTitle(title: string): string {
  // Remove year + optional rating suffix: "Movie, 1984 - ★★★½" → "Movie"
  return title.replace(/,\s*\d{4}\s*(-\s*[★½]+)?$/, '').trim()
}

/**
 * Sanitise Letterboxd RSS description HTML.
 * Removes the poster `<img>` block (first image wrapped in a <p>)
 * but keeps formatting, media, and structural tags so reviews render
 * with their original bold text, embedded images, videos, etc.
 */
function cleanDescription(description: string): string {
  if (!description) return ''
  // Remove the poster <img> block (first <p> containing only an <img>)
  const withoutPoster = description.replace(/<p>\s*<img[^>]*>\s*<\/p>/i, '')
  // Strip only script/style/form tags for safety — keep everything else
  const sanitised = withoutPoster.replace(
    /<\/?(?:script|style|form|input|textarea|select|button)\b[^>]*>/gi,
    '',
  )
  return sanitised.trim()
}

/** Strip ALL HTML — used only to detect "Watched on" plain-text prefix. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * Fetch the display name for a Letterboxd user from their RSS feed.
 * Returns undefined if the feed can't be reached or has no creator tag.
 */
export async function fetchDisplayName(username: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://letterboxd.com/${username}/rss/`)
    if (!response.ok) return undefined
    const xml = await response.text()
    const parsed = parser.parse(xml)
    const items = parsed?.rss?.channel?.item
    const first = Array.isArray(items) ? items[0] : items
    return first?.['dc:creator'] || undefined
  } catch {
    return undefined
  }
}

async function fetchUserFeed(username: string): Promise<Review[]> {
  try {
    // Fetch RSS feed and avatar in parallel — avatar is cached after first call
    const [response, avatarUrl] = await Promise.all([
      fetch(`https://letterboxd.com/${username}/rss/`),
      fetchAvatarUrl(username),
    ])
    if (!response.ok) return []

    const xml = await response.text()
    const parsed = parser.parse(xml)

    const channel = parsed?.rss?.channel
    if (!channel) return []

    // Normalize items to array
    let items = channel.item
    if (!items) return []
    if (!Array.isArray(items)) items = [items]

    const reviews: Review[] = []

    for (const item of items) {
      const link = item.link || ''

      // Skip list activity
      if (link.includes('/list/')) continue

      const title = item.title || ''
      const description = item.description || ''
      const htmlReview = cleanDescription(description)
      const plainText = stripHtml(htmlReview)

      // Determine type: empty review or "Watched on" → watch
      const isWatch = !plainText || plainText.startsWith('Watched on')

      reviews.push({
        id: `${username}-${link}`,
        username,
        title,
        link,
        pubDate: item.pubDate || '',
        creator: item['dc:creator'] || username,
        review: isWatch ? '' : htmlReview,
        rating: extractRating(title),
        movieTitle: extractMovieTitle(title),
        type: isWatch ? 'watch' : 'review',
        avatarUrl,
      })
    }

    return reviews
  } catch (err) {
    console.warn(`Failed to fetch feed for ${username}:`, err)
    return []
  }
}

export interface FeedResult {
  reviews: Review[]
  hasMore: boolean
  total: number
}

export async function fetchFeed(
  usernames: string[],
  page = 1
): Promise<FeedResult> {
  if (usernames.length === 0) {
    return { reviews: [], hasMore: false, total: 0 }
  }

  // Fetch all users in parallel
  const results = await Promise.all(usernames.map(fetchUserFeed))
  const allReviews = results.flat()

  // Sort by date descending
  allReviews.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  )

  const total = allReviews.length
  const start = (page - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE

  return {
    reviews: allReviews.slice(start, end),
    hasMore: end < total,
    total,
  }
}
