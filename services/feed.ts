import { XMLParser } from 'fast-xml-parser'
import type { Review } from '@/types/database'
import { stripHtml } from '@/utils/html'

const PAGE_SIZE = 50
const FEED_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface FeedCacheEntry {
  reviews: Review[]
  fetchedAt: number
}

const feedCache = new Map<string, FeedCacheEntry>()

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

async function _fetchUserFeed(username: string): Promise<Review[]> {
  try {
    const response = await fetch(`https://letterboxd.com/${username}/rss/`)
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
      })
    }

    return reviews
  } catch (err) {
    console.warn(`Failed to fetch feed for ${username}:`, err)
    return []
  }
}

/**
 * Fetch a user's RSS feed with 5-minute in-memory caching.
 * Both FeedScreen and ExternalProfileScreen go through this,
 * so a user's data is fetched at most once per 5 minutes.
 */
export async function fetchUserFeed(username: string): Promise<Review[]> {
  const cached = feedCache.get(username)
  if (cached && Date.now() - cached.fetchedAt < FEED_CACHE_TTL) {
    return cached.reviews
  }

  const reviews = await _fetchUserFeed(username)
  feedCache.set(username, { reviews, fetchedAt: Date.now() })
  return reviews
}

/** Clear the in-memory feed cache. Call before re-fetching on pull-to-refresh. */
export function clearFeedCache(): void {
  feedCache.clear()
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
