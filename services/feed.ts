import { XMLParser } from 'fast-xml-parser'
import type { Review } from '@/types/database'

const PAGE_SIZE = 50

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

function extractRating(title: string): string {
  const match = title.match(/ - ([★½]+)$/)
  return match ? match[1] : ''
}

function extractMovieTitle(title: string): string {
  // Remove year + optional rating suffix: "Movie, 1984 - ★★★½" → "Movie"
  return title.replace(/,\s*\d{4}\s*(-\s*[★½]+)?$/, '').trim()
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function cleanDescription(description: string): string {
  if (!description) return ''
  // Remove the poster <img> tag first, then strip remaining HTML
  const withoutPoster = description.replace(/<p>\s*<img[^>]*>\s*<\/p>/i, '')
  return stripHtml(withoutPoster)
}

async function fetchUserFeed(username: string): Promise<Review[]> {
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
      const cleanedReview = cleanDescription(description)

      // Determine type: empty review or "Watched on" → watch
      const isWatch =
        !cleanedReview || cleanedReview.startsWith('Watched on')

      reviews.push({
        id: `${username}-${link}`,
        username,
        title,
        link,
        pubDate: item.pubDate || '',
        creator: item['dc:creator'] || username,
        review: isWatch ? '' : cleanedReview,
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
